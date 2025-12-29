import { IIndexMeta, IndexType, ISegmentMeta, IStorage } from './Types';

const META_FILE = 'search_meta.json';
const DELETED_IDS_FILE = 'deleted_ids.bin';
const ADDED_IDS_FILE = 'added_ids.bin';
const SEPARATOR = 0x1E;

export class MetaManager {
    #storage: IStorage;
    #meta: IIndexMeta = {
        wordSegments: [],
        charSegments: []
    };
    #deletedIds: Set<number> = new Set();
    #addedIds: Set<number> = new Set();

    constructor(storage: IStorage) {
        this.#storage = storage;
    }

    async load(): Promise<void> {
        // 加载元数据
        const buffer = await this.#storage.read(META_FILE);
        if (buffer) {
            const json = new TextDecoder().decode(buffer);
            this.#meta = JSON.parse(json);
        } else {
            this.#meta = { wordSegments: [], charSegments: [] };
        }

        // 加载已删除ID
        const deletedBuffer = await this.#storage.read(DELETED_IDS_FILE);
        if (deletedBuffer) {
            const view = new DataView(deletedBuffer);
            let offset = 0;
            const max = deletedBuffer.byteLength;

            while (offset < max) {
                if (offset + 4 > max) break;
                const id = view.getUint32(offset, true);
                this.#deletedIds.add(id);
                offset += 4;

                if (offset < max && view.getUint8(offset) === SEPARATOR) {
                    offset += 1;
                }
            }
        }

        // 加载已添加ID
        const addedBuffer = await this.#storage.read(ADDED_IDS_FILE);
        if (addedBuffer) {
            const view = new DataView(addedBuffer);
            let offset = 0;
            const max = addedBuffer.byteLength;

            while (offset < max) {
                if (offset + 4 > max) break;
                const id = view.getUint32(offset, true);
                this.#addedIds.add(id);
                offset += 4;

                if (offset < max && view.getUint8(offset) === SEPARATOR) {
                    offset += 1;
                }
            }
        }
    }

    async save(): Promise<void> {
        // 保存元数据
        const json = JSON.stringify(this.#meta);
        await this.#storage.write(META_FILE, new TextEncoder().encode(json).buffer);

        // 保存已删除ID
        if (this.#deletedIds.size === 0) {
            await this.#storage.remove(DELETED_IDS_FILE);
        } else {
            const totalSize = this.#deletedIds.size * 4 + this.#deletedIds.size; // 4字节ID + 1字节分隔符
            const buffer = new ArrayBuffer(totalSize);
            const view = new DataView(buffer);
            let offset = 0;

            for (const id of this.#deletedIds) {
                view.setUint32(offset, id, true);
                offset += 4;
                view.setUint8(offset, SEPARATOR);
                offset += 1;
            }

            await this.#storage.write(DELETED_IDS_FILE, buffer);
        }

        // 保存已添加ID
        if (this.#addedIds.size === 0) {
            await this.#storage.remove(ADDED_IDS_FILE);
        } else {
            const totalSize = this.#addedIds.size * 4 + this.#addedIds.size; // 4字节ID + 1字节分隔符
            const buffer = new ArrayBuffer(totalSize);
            const view = new DataView(buffer);
            let offset = 0;

            for (const id of this.#addedIds) {
                view.setUint32(offset, id, true);
                offset += 4;
                view.setUint8(offset, SEPARATOR);
                offset += 1;
            }

            await this.#storage.write(ADDED_IDS_FILE, buffer);
        }
    }

    getSegments(type: IndexType): ISegmentMeta[] {
        return type === 'word' ? this.#meta.wordSegments : this.#meta.charSegments;
    }

    getDeletedIds(): ReadonlySet<number> {
        return this.#deletedIds;
    }

    addDeletedId(id: number): void {
        this.#deletedIds.add(id);
    }

    isDeleted(id: number): boolean {
        return this.#deletedIds.has(id);
    }

    addAddedId(id: number): void {
        this.#addedIds.add(id);
    }

    removeAddedId(id: number): void {
        this.#addedIds.delete(id);
    }

    isAdded(id: number): boolean {
        return this.#addedIds.has(id);
    }

    getAddedIds(): ReadonlySet<number> {
        return this.#addedIds;
    }

    /**
     * 检查文档ID是否曾经添加过（包括已删除的）
     * @param id 文档ID
     * @returns 文档是否曾经添加过的布尔值
     */
    hasDocument(id: number): boolean {
        return this.#addedIds.has(id) || this.#deletedIds.has(id);
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
        this.#meta = { wordSegments: [], charSegments: [] };
        this.#deletedIds.clear();
        this.#addedIds.clear();
    }
}
