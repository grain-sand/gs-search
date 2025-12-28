import { IStorage } from '../../src';

// 简单的内存存储实现，用于测试 IStorage 外部化
export class MockStorage implements IStorage {
	files = new Map<string, ArrayBuffer>();

	async write(filename: string, data: ArrayBuffer): Promise<void> {
		this.files.set(filename, data);
	}

	async append(filename: string, data: ArrayBuffer): Promise<void> {
		const old = this.files.get(filename) || new ArrayBuffer(0);
		const combined = new Uint8Array(old.byteLength + data.byteLength);
		combined.set(new Uint8Array(old), 0);
		combined.set(new Uint8Array(data), old.byteLength);
		this.files.set(filename, combined.buffer);
	}

	async read(filename: string): Promise<ArrayBuffer | null> {
		const d = this.files.get(filename);
		return d ? d.slice(0) : null;
	}

	async readRange(filename: string, start: number, end: number): Promise<ArrayBuffer | null> {
		const d = this.files.get(filename);
		if (!d) return null;
		return d.slice(start, end);
	}

	async remove(filename: string): Promise<void> {
		this.files.delete(filename);
	}

	async listFiles(): Promise<string[]> {
		return Array.from(this.files.keys());
	}

	async clearAll(): Promise<void> {
		this.files.clear();
	}

	async getFileSize(filename: string): Promise<number> {
		return this.files.get(filename)?.byteLength || 0;
	}
}
