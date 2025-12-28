import { ITokenizedDoc, IStorage } from './Types';

export class IndexSegment {
    #filename: string;
    #storage: IStorage;
    #buffer: ArrayBuffer | null = null;
    #view: DataView | null = null;

    static hash(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash >>> 0;
    }

    constructor(filename: string, storage: IStorage) {
        this.#filename = filename;
        this.#storage = storage;
    }

    async loadIndex(): Promise<boolean> {
        if (this.#buffer) return true;
        this.#buffer = await this.#storage.read(this.#filename);
        if (this.#buffer) {
            this.#view = new DataView(this.#buffer);
            return true;
        }
        return false;
    }

    async buildAndSave(docs: ITokenizedDoc[]): Promise<void> {
        const inverted = new Map<number, number[]>();

        for (const doc of docs) {
            const uniqueTokens = new Set(doc.tokens);
            for (const token of uniqueTokens) {
                const h = IndexSegment.hash(token);
                if (!inverted.has(h)) inverted.set(h, []);
                inverted.get(h)!.push(doc.id);
            }
        }

        const sortedHashes = Array.from(inverted.keys()).sort((a, b) => a - b);
        let totalPostings = 0;
        sortedHashes.forEach(h => totalPostings += inverted.get(h)!.length);

        const headerSize = 8;
        const dictSize = sortedHashes.length * 12;
        const postingsSize = totalPostings * 4;
        const totalSize = headerSize + dictSize + postingsSize;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        view.setUint32(0, 0x494E4458);
        view.setUint32(4, sortedHashes.length);

        let currentDictOffset = headerSize;
        let currentPostingsOffset = headerSize + dictSize;

        for (const h of sortedHashes) {
            const list = inverted.get(h)!;
            view.setUint32(currentDictOffset, h);
            view.setUint32(currentDictOffset + 4, currentPostingsOffset);
            view.setUint32(currentDictOffset + 8, list.length);
            currentDictOffset += 12;

            for (const number of list) {
                view.setUint32(currentPostingsOffset, number);
                currentPostingsOffset += 4;
            }
        }

        await this.#storage.write(this.#filename, buffer);
        this.#buffer = buffer;
        this.#view = view;
    }

    search(term: string): number[] {
        if (!this.#view || !this.#buffer) return [];
        const h = IndexSegment.hash(term);
        const count = this.#view.getUint32(4);

        let left = 0;
        let right = count - 1;
        const headerSize = 8;
        const entrySize = 12;

        while (left <= right) {
            const mid = (left + right) >>> 1;
            const entryPos = headerSize + mid * entrySize;
            const entryHash = this.#view.getUint32(entryPos);

            if (entryHash < h) {
                left = mid + 1;
            } else if (entryHash > h) {
                right = mid - 1;
            } else {
                const offset = this.#view.getUint32(entryPos + 4);
                const len = this.#view.getUint32(entryPos + 8);
                const result: number[] = [];
                for (let i = 0; i < len; i++) {
                    result.push(this.#view.getUint32(offset + i * 4));
                }
                return result;
            }
        }
        return [];
    }
}
