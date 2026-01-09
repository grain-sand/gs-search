/**
 * 浏览器实现 (OPFS - 子目录隔离)
 * 支持 Main Thread 和 Web Worker
 */
import { IStorage } from '../type';

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
