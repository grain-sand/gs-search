import { ITokenizedDoc, IStorage } from './Types';
import { hash } from './Hash';

export class IndexSegment {
    #filename: string;
    #storage: IStorage;
    #buffer: ArrayBuffer | null = null;
    #view: DataView | null = null;

    /**
     * 使用MurmurHash3计算字符串哈希值
     * @param str 要哈希的字符串
     * @returns 32位无符号哈希值
     */
    static hash(str: string): number {
        return hash(str);
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

        // 优化1: 使用对象去重而非Set，减少内存开销
        for (const doc of docs) {
            const uniqueTokens = new Map<string, boolean>();
            for (const token of doc.tokens) {
                if (!uniqueTokens.has(token)) {
                    uniqueTokens.set(token, true);
                    const h = IndexSegment.hash(token);
                    if (!inverted.has(h)) inverted.set(h, []);
                    inverted.get(h)!.push(doc.id);
                }
            }
        }

        const sortedHashes = Array.from(inverted.keys()).sort((a, b) => a - b);
        let totalPostings = 0;

        // 预分配空间，减少多次分配开销
        const postingsLists = new Array(sortedHashes.length);
        for (let i = 0; i < sortedHashes.length; i++) {
            const h = sortedHashes[i];
            const list = inverted.get(h)!;
            postingsLists[i] = list;
            totalPostings += list.length;
        }

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

        for (let i = 0; i < sortedHashes.length; i++) {
            const h = sortedHashes[i];
            const list = postingsLists[i];
            view.setUint32(currentDictOffset, h);
            view.setUint32(currentDictOffset + 4, currentPostingsOffset);
            view.setUint32(currentDictOffset + 8, list.length);
            currentDictOffset += 12;

            // 使用更快的方式写入文档ID
            for (let j = 0; j < list.length; j++) {
                view.setUint32(currentPostingsOffset, list[j], true);
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
                    // 使用小端字节序读取文档ID，与写入时保持一致
                    result.push(this.#view.getUint32(offset + i * 4, true));
                }
                return result;
            }
        }
        return [];
    }
}
