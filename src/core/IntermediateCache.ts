import { IStorage } from './Types';
import { ITokenizedDoc } from './Types';

export class IntermediateCache {
    static readonly SEPARATOR = 0x1E;
    #storage: IStorage;

    constructor(storage: IStorage) {
        this.#storage = storage;
    }

    async appendBatch(filename: string, docs: ITokenizedDoc[]): Promise<number> {
        if (docs.length === 0) {
            return await this.#storage.getFileSize(filename);
        }

        const encoder = new TextEncoder();
        let totalLen = 0;

        // 先计算总大小，避免多次分配内存
        for (const doc of docs) {
            totalLen += 8; // id (4) + token count (4)
            for (const token of doc.tokens) {
                const tokenLen = Math.min(encoder.encode(token).byteLength, 65535);
                totalLen += 2 + tokenLen; // token length (2) + token data
            }
            totalLen += 1; // separator
        }

        // 一次性分配足够的内存
        const combined = new Uint8Array(totalLen);
        let pos = 0;

        for (const doc of docs) {
            const tokenBuffers: Uint8Array[] = [];

            // 编码所有token，计算文档大小
            for (const token of doc.tokens) {
                const buf = encoder.encode(token);
                const finalBuf = buf.byteLength > 65535 ? buf.slice(0, 65535) : buf;
                tokenBuffers.push(finalBuf);
            }

            // 写入文档头部
            const view = new DataView(combined.buffer, pos);
            view.setUint32(0, doc.id, true);
            view.setUint32(4, tokenBuffers.length, true);
            pos += 8;

            // 写入所有token
            for (const buf of tokenBuffers) {
                const tokenView = new DataView(combined.buffer, pos);
                tokenView.setUint16(0, buf.byteLength, true);
                pos += 2;
                combined.set(buf, pos);
                pos += buf.byteLength;
            }

            // 写入分隔符
            combined[pos++] = IntermediateCache.SEPARATOR;
        }

        await this.#storage.append(filename, combined.buffer);
        return await this.#storage.getFileSize(filename);
    }

    async readRange(filename: string, start: number, end: number): Promise<ITokenizedDoc[]> {
        const buffer = await this.#storage.readRange(filename, start, end);
        if (!buffer || buffer.byteLength === 0) return [];

        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);
        const decoder = new TextDecoder();

        const docs: ITokenizedDoc[] = [];
        let offset = 0;
        const max = buffer.byteLength;

        while (offset < max) {
            if (offset + 8 > max) break;
            const id = view.getUint32(offset, true); offset += 4;
            const count = view.getUint32(offset, true); offset += 4;
            const tokens: string[] = [];
            for (let i = 0; i < count; i++) {
                if (offset + 2 > max) break;
                const len = view.getUint16(offset, true); offset += 2;
                if (offset + len > max) break;
                const textBuf = new Uint8Array(buffer, offset, len);
                tokens.push(decoder.decode(textBuf));
                offset += len;
            }
            if (offset < max && uint8[offset] === IntermediateCache.SEPARATOR) {
                offset += 1;
            }
            docs.push({ id, tokens });
        }
        return docs;
    }

    async getCurrentSize(filename: string): Promise<number> {
        return await this.#storage.getFileSize(filename);
    }
}
