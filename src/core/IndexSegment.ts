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
        // 哈希冲突处理：使用token作为键的Map，值为{hash, postingsList}对象
        const tokenMap = new Map<string, { hash: number; postings: number[] }>();

        // 优化1: 使用对象去重而非Set，减少内存开销
        for (const doc of docs) {
            const uniqueTokens = new Map<string, boolean>();
            for (const token of doc.tokens) {
                if (!uniqueTokens.has(token)) {
                    uniqueTokens.set(token, true);
                    if (!tokenMap.has(token)) {
                        tokenMap.set(token, { 
                            hash: IndexSegment.hash(token), 
                            postings: [] 
                        });
                    }
                    tokenMap.get(token)!.postings.push(doc.id);
                }
            }
        }

        // 按哈希值排序，相同哈希值的token会排在一起，便于处理冲突
        const entries = Array.from(tokenMap.entries());
        entries.sort(([tokenA, { hash: hashA }], [tokenB, { hash: hashB }]) => {
            if (hashA !== hashB) return hashA - hashB;
            // 相同哈希值按token字典序排序
            return tokenA.localeCompare(tokenB);
        });

        // 计算所需空间
        let totalPostings = 0;
        let totalTokensSize = 0;
        
        for (const [token, { postings }] of entries) {
            totalPostings += postings.length;
            totalTokensSize += token.length + 1; // +1 for null terminator
        }

        // 索引结构：
        // 头部：12字节（4字节魔数 + 4字节条目数 + 4字节tokens区域偏移）
        // 字典：每个条目20字节（4字节哈希值 + 4字节token长度 + 4字节token偏移 + 4字节postings偏移 + 4字节postings长度）
        // Postings：每个文档ID 4字节
        // Tokens：存储所有token字符串，以null结尾
        
        const headerSize = 12;
        const dictSize = entries.length * 20;
        const postingsSize = totalPostings * 4;
        const tokensOffset = headerSize + dictSize + postingsSize;
        const totalSize = tokensOffset + totalTokensSize;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // 写入头部
        view.setUint32(0, 0x494E4458); // 魔数
        view.setUint32(4, entries.length); // 条目数
        view.setUint32(8, tokensOffset); // tokens区域偏移

        let currentDictOffset = headerSize;
        let currentPostingsOffset = headerSize + dictSize;
        let currentTokenOffset = tokensOffset;

        for (const [token, { hash, postings }] of entries) {
            // 写入字典条目
            view.setUint32(currentDictOffset, hash);
            view.setUint32(currentDictOffset + 4, token.length);
            view.setUint32(currentDictOffset + 8, currentTokenOffset);
            view.setUint32(currentDictOffset + 12, currentPostingsOffset);
            view.setUint32(currentDictOffset + 16, postings.length);
            currentDictOffset += 20;

            // 写入postings
            for (let j = 0; j < postings.length; j++) {
                view.setUint32(currentPostingsOffset, postings[j], true);
                currentPostingsOffset += 4;
            }

            // 写入token（UTF-8编码）
            const encoder = new TextEncoder();
            const tokenBytes = encoder.encode(token);
            for (let j = 0; j < tokenBytes.length; j++) {
                view.setUint8(currentTokenOffset++, tokenBytes[j]);
            }
            // 写入null terminator
            view.setUint8(currentTokenOffset++, 0);
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
        const headerSize = 12;
        const entrySize = 20;
        const decoder = new TextDecoder();

        // 二分查找哈希值
        while (left <= right) {
            const mid = (left + right) >>> 1;
            const entryPos = headerSize + mid * entrySize;
            const entryHash = this.#view.getUint32(entryPos);

            if (entryHash < h) {
                left = mid + 1;
            } else if (entryHash > h) {
                right = mid - 1;
            } else {
                // 检查是否存在哈希冲突
                const hasConflict = (mid > 0 && this.#view.getUint32(headerSize + (mid - 1) * entrySize) === h) || 
                                    (mid < count - 1 && this.#view.getUint32(headerSize + (mid + 1) * entrySize) === h);
                
                if (!hasConflict) {
                    // 无冲突，直接返回当前条目的postings
                    const postingsOffset = this.#view.getUint32(headerSize + mid * entrySize + 12);
                    const postingsLen = this.#view.getUint32(headerSize + mid * entrySize + 16);
                    const result: number[] = [];
                    for (let j = 0; j < postingsLen; j++) {
                        result.push(this.#view.getUint32(postingsOffset + j * 4, true));
                    }
                    return result;
                }
                
                // 存在冲突，需要检查实际token是否匹配
                // 由于相同哈希值的token是连续存储的，需要向前和向后搜索所有匹配的哈希值
                // 先找到第一个匹配的哈希值
                let firstMatch = mid;
                while (firstMatch > 0) {
                    const prevPos = headerSize + (firstMatch - 1) * entrySize;
                    if (this.#view.getUint32(prevPos) === h) {
                        firstMatch--;
                    } else {
                        break;
                    }
                }

                // 搜索所有匹配的哈希值，检查token是否完全匹配
                for (let i = firstMatch; i < count; i++) {
                    const checkPos = headerSize + i * entrySize;
                    const checkHash = this.#view.getUint32(checkPos);
                    if (checkHash !== h) break;

                    // 读取token并比较
                    const tokenLen = this.#view.getUint32(checkPos + 4);
                    const tokenOffset = this.#view.getUint32(checkPos + 8);
                    const tokenBuffer = new Uint8Array(this.#buffer, tokenOffset, tokenLen);
                    const storedToken = decoder.decode(tokenBuffer);

                    if (storedToken === term) {
                        // 找到完全匹配的token，返回postings
                        const postingsOffset = this.#view.getUint32(checkPos + 12);
                        const postingsLen = this.#view.getUint32(checkPos + 16);
                        const result: number[] = [];
                        for (let j = 0; j < postingsLen; j++) {
                            result.push(this.#view.getUint32(postingsOffset + j * 4, true));
                        }
                        return result;
                    }
                }
                return [];
            }
        }
        return [];
    }
}
