// noinspection TypeScriptUnresolvedReference

import { IStorage } from './Types';

/**
 * 浏览器实现 (OPFS - 子目录隔离)
 * 支持 Main Thread 和 Web Worker
 */
export class BrowserStorage implements IStorage {
    #baseDir: string;

    constructor(baseDir: string) {
        this.#baseDir = baseDir;
    }

    // 获取当前实例的专属目录句柄
    async #getDirHandle() {
        const root = await navigator.storage.getDirectory();
        // create: true 确保目录存在
        return await root.getDirectoryHandle(this.#baseDir, { create: true });
    }

    async write(filename: string, data: ArrayBuffer): Promise<void> {
        const dir = await this.#getDirHandle();
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
    }

    async append(filename: string, data: ArrayBuffer): Promise<void> {
        const dir = await this.#getDirHandle();
        let fileHandle;
        try {
            fileHandle = await dir.getFileHandle(filename, { create: true });
        } catch {
            fileHandle = await dir.getFileHandle(filename, { create: true });
        }
        const file = await fileHandle.getFile();
        const writable = await fileHandle.createWritable({ keepExistingData: true });
        await writable.seek(file.size);
        await writable.write(data);
        await writable.close();
    }

    async read(filename: string): Promise<ArrayBuffer | null> {
        const dir = await this.#getDirHandle();
        try {
            const fileHandle = await dir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return await file.arrayBuffer();
        } catch { return null; }
    }

    async readRange(filename: string, start: number, end: number): Promise<ArrayBuffer | null> {
        const dir = await this.#getDirHandle();
        try {
            const fileHandle = await dir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return await file.slice(start, end).arrayBuffer();
        } catch { return null; }
    }

    async remove(filename: string): Promise<void> {
        const dir = await this.#getDirHandle();
        try { await dir.removeEntry(filename); } catch {}
    }

    async listFiles(): Promise<string[]> {
        const dir = await this.#getDirHandle();
        const keys: string[] = [];
        // @ts-ignore
        for await (const key of dir.keys()) keys.push(key);
        return keys;
    }

    async clearAll(): Promise<void> {
        const dir = await this.#getDirHandle();
        // @ts-ignore
        for await (const key of dir.keys()) {
            await dir.removeEntry(key, { recursive: true });
        }
    }

    async getFileSize(filename: string): Promise<number> {
        const dir = await this.#getDirHandle();
        try {
            const fh = await dir.getFileHandle(filename);
            const f = await fh.getFile();
            return f.size;
        } catch { return 0; }
    }
}

/**
 * Node.js 实现
 */
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
        const fsModule = await import('node:fs');
        const pathModule = await import('node:path');
        this.#fs = fsModule.promises;
        this.#path = pathModule.default || pathModule;

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
