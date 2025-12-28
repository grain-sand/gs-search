// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {SearchEngine, IStorage} from '../src';

function getTestBaseDir() {
	let workerId = '0';
	if (typeof process !== 'undefined' && process.env) {
		workerId = process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0';
	}
	return `core_test_data_${workerId}`;
}

// 简单的内存存储实现，用于测试 IStorage 外部化
class MockStorage implements IStorage {
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

describe('SearchEngine', () => {
	let engine: SearchEngine;

	beforeEach(async () => {
		engine = new SearchEngine({
			baseDir: getTestBaseDir(),
			wordSegmentTokenThreshold: 50
		});
		await engine.clearAll();
	});

	afterAll(async () => {
		const base = getTestBaseDir();
		const dirsToClean = [base, base + '_node', base + '_custom'];
		try{
			const fs = await import('node:fs');
			dirsToClean.forEach(d => {
				if (fs.existsSync(d)) {
					try {
						fs.rmSync(d, {recursive: true, force: true});
					} catch (e) {
						console.error(`Failed to cleanup test dir ${d}:`, e);
					}
				}
			});
		} catch (e:any) {

		}
	});



	it('已删除的文档ID不能重新添加', async () => {
		// 添加文档
		await engine.addDocument({id: 100, text: "test document"});
		let res = await engine.search("test");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe(100);

		// 删除文档
		await engine.removeDocument(100);
		res = await engine.search("test");
		expect(res.length).toBe(0);

		// 尝试重新添加，应该抛出异常
		await expect(engine.addDocument({id: 100, text: "re-added document"})).rejects.toThrow(
			"Document ID 100 has been deleted and cannot be re-added."
		);
	});
});
