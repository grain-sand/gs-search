// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {CoreSearchEngine, IStorage} from '../src';

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

describe('CoreSearchEngine', () => {
	let engine: CoreSearchEngine;

	beforeEach(async () => {
		engine = new CoreSearchEngine({
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

	it('支持使用自定义存储实现(MockStorage)', async () => {
		const mockStorage = new MockStorage();
		const customEngine = new CoreSearchEngine({
			baseDir: 'irrelevant',
			storage: mockStorage
		});

		await customEngine.addDocument({id: 99, text: "custom storage test"});
		const res = await customEngine.search("custom");

		expect(res.length).toBe(1);
		expect(res[0].id).toBe(99);
		// 验证确实写入了 MockStorage
		expect(await mockStorage.listFiles()).toContain('search_meta.json');
	});

	it('支持显示指定 storage: "node|browser" (字符串配置)', async () => {
		// 强制使用 NodeStorage (在测试环境中应当有效)
		// noinspection SuspiciousTypeOfGuard
		const nodeEngine = new CoreSearchEngine({
			baseDir: getTestBaseDir() + '_node',
			storage: navigator?.storage?.getDirectory instanceof Function ? 'browser' : 'node'
		});
		await nodeEngine.clearAll();
		await nodeEngine.addDocument({id: 1, text: 'node test'});
		const res = await nodeEngine.search('node');
		expect(res.length).toBe(1);
	});

	it('支持分词器配置分离', async () => {
		const customEngine = new CoreSearchEngine({
			baseDir: getTestBaseDir() + '_custom',
			indexingTokenizer: (t) => t.split(' '),
			searchTokenizer: (t) => t.split(',')
		});
		await customEngine.clearAll();
		await customEngine.addDocument({id: 1, text: "hello world"});

		const res = await customEngine.search("hello,world");
		expect(res.length).toBe(1);
		expect(res[0].tokens.sort()).toEqual(['hello', 'world']);
	});

	it('搜索结果数量限制参数应生效', async () => {
		await engine.addDocuments([
			{id: 1, text: "limit test A"},
			{id: 2, text: "limit test B"},
			{id: 3, text: "limit test C"}
		]);

		const res2 = await engine.search("limit", 2);
		expect(res2.length).toBe(2);
	});
});
