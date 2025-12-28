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
        const chunks: Uint8Array[] = [];
        let totalLen = 0;

        for (const doc of docs) {
            let docSize = 8;
            const tokenBuffers: Uint8Array[] = [];

            for (const token of doc.tokens) {
                const buf = encoder.encode(token);
                const finalBuf = buf.byteLength > 65535 ? buf.slice(0, 65535) : buf;
                tokenBuffers.push(finalBuf);
                docSize += 2 + finalBuf.byteLength;
            }
            docSize += 1;

            const buffer = new ArrayBuffer(docSize);
            const view = new DataView(buffer);
            const uint8 = new Uint8Array(buffer);

            let offset = 0;
            view.setUint32(offset, doc.id, true); offset += 4;
            view.setUint32(offset, tokenBuffers.length, true); offset += 4;

            for (const buf of tokenBuffers) {
                view.setUint16(offset, buf.byteLength, true); offset += 2;
                uint8.set(buf, offset); offset += buf.byteLength;
            }
            uint8[offset] = IntermediateCache.SEPARATOR;

            const chunk = new Uint8Array(buffer);
            chunks.push(chunk);
            totalLen += chunk.byteLength;
        }

        const combined = new Uint8Array(totalLen);
        let pos = 0;
        for (const chunk of chunks) {
            combined.set(chunk, pos);
            pos += chunk.byteLength;
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
