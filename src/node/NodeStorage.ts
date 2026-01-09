// noinspection TypeScriptUnresolvedReference
/**
 * Node.js 实现
 */
import { IStorage } from '../type';

export class NodeStorage implements IStorage {
    #fs: any = null;
    #path: any = null;
    #baseDir: string;
    #fullDataDir: string = '';

    constructor(baseDir: string) {
        this.#baseDir = baseDir;
    }

    async #init() {
        if (this.#fs) return;
        const fsModule = await import('fs/promises');
        const pathModule = await import('path');
        this.#fs = fsModule;
        this.#path = pathModule;

        this.#fullDataDir = this.#path.join(process.cwd(), this.#baseDir);

        try {
            await this.#fs.access(this.#fullDataDir);
        } catch {
            await this.#fs.mkdir(this.#fullDataDir, { recursive: true });
        }
    }

    #p(filename: string) { return this.#path.join(this.#fullDataDir, filename); }

    async write(filename: string, data: ArrayBuffer): Promise<void> {
        await this.#init();
        await this.#fs.writeFile(this.#p(filename), Buffer.from(data));
    }

    async append(filename: string, data: ArrayBuffer): Promise<void> {
        await this.#init();
        await this.#fs.appendFile(this.#p(filename), Buffer.from(data));
    }

    async read(filename: string): Promise<ArrayBuffer | null> {
        await this.#init();
        try {
            const buf = await this.#fs.readFile(this.#p(filename));
            return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        } catch { return null; }
    }

    async readRange(filename: string, start: number, end: number): Promise<ArrayBuffer | null> {
        await this.#init();
        try {
            const fd = await this.#fs.open(this.#p(filename), 'r');
            const len = end - start;
            const buf = Buffer.alloc(len);
            await fd.read(buf, 0, len, start);
            await fd.close();
            return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        } catch { return null; }
    }

    async remove(filename: string): Promise<void> {
        await this.#init();
        try { await this.#fs.unlink(this.#p(filename)); } catch {}
    }

    async listFiles(): Promise<string[]> {
        await this.#init();
        try { return await this.#fs.readdir(this.#fullDataDir); } catch { return []; }
    }

    async clearAll(): Promise<void> {
        await this.#init();
        try {
            const files = await this.#fs.readdir(this.#fullDataDir);
            for (const f of files) {
                await this.#fs.unlink(this.#path.join(this.#fullDataDir, f));
            }
        } catch {}
    }

    async getFileSize(filename: string): Promise<number> {
        await this.#init();
        try {
            const stat = await this.#fs.stat(this.#p(filename));
            return stat.size;
        } catch { return 0; }
    }
}
