import { IIndexMeta, IndexType, ISegmentMeta, IStorage } from './Types';

const META_FILE = 'search_meta.json';

export class MetaManager {
    #storage: IStorage;
    #meta: IIndexMeta = {
        wordSegments: [],
        charSegments: [],
        deletednumbers: []
    };

    constructor(storage: IStorage) {
        this.#storage = storage;
    }

    async load(): Promise<void> {
        const buffer = await this.#storage.read(META_FILE);
        if (buffer) {
            const json = new TextDecoder().decode(buffer);
            this.#meta = JSON.parse(json);
        } else {
            this.#meta = { wordSegments: [], charSegments: [], deletednumbers: [] };
        }
    }

    async save(): Promise<void> {
        const json = JSON.stringify(this.#meta);
        await this.#storage.write(META_FILE, new TextEncoder().encode(json).buffer);
    }

    getSegments(type: IndexType): ISegmentMeta[] {
        return type === 'word' ? this.#meta.wordSegments : this.#meta.charSegments;
    }

    getDeletedIds(): Set<number> {
        return new Set(this.#meta.deletednumbers);
    }

    addDeletedId(id: number) {
        if (!this.#meta.deletednumbers.includes(id)) {
            this.#meta.deletednumbers.push(id);
        }
    }

    getLastSegmentInfo(type: IndexType) {
        const segments = this.getSegments(type);
        if (segments.length === 0) return null;
        return segments[segments.length - 1];
    }

    updateSegment(type: IndexType, filename: string, start: number, end: number, tokenCount: number, isNew: boolean) {
        const segments = type === 'word' ? this.#meta.wordSegments : this.#meta.charSegments;
        if (isNew) {
            segments.push({ filename, start, end, tokenCount });
        } else {
            const last = segments[segments.length - 1];
            if (last && last.filename === filename) {
                last.end = end;
                last.tokenCount = tokenCount;
            }
        }
    }

    reset() {
        this.#meta = { wordSegments: [], charSegments: [], deletednumbers: [] };
    }
}
