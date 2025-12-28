// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {SearchEngine, IStorage, IDocument} from '../src';

function getTestBaseDir(prefix: string = '') {
	let workerId = '0';
	if (typeof process !== 'undefined' && process.env) {
		workerId = process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0';
	}
	return `config_test_data_${prefix}_${workerId}`;
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

describe('SearchEngine Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		const prefixes = ['storage', 'tokenizer', 'threshold', 'min-save', 'search'];
		try {
			const fs = await import('node:fs');
			prefixes.forEach(prefix => {
				const dirsToClean = [
					getTestBaseDir(prefix),
					getTestBaseDir(prefix) + '_node',
					getTestBaseDir(prefix) + '_custom'
				];
				dirsToClean.forEach(d => {
					if (fs.existsSync(d)) {
						try {
							fs.rmSync(d, {recursive: true, force: true});
						} catch (e) {
							console.error(`Failed to cleanup test dir ${d}:`, e);
						}
					}
				});
			});
		} catch (e: any) {
			// Ignore errors in non-Node environments
		}
	});

	describe('Storage Configuration', () => {
		it('should support custom storage implementation (MockStorage)', async () => {
			const mockStorage = new MockStorage();
			const customEngine = new SearchEngine({
				baseDir: getTestBaseDir('storage'),
				storage: mockStorage
			});

			await customEngine.addDocument({id: 99, text: "custom storage test"});
			const res = await customEngine.search("custom");

			expect(res.length).toBe(1);
			expect(res[0].id).toBe(99);
			// 验证确实写入了 MockStorage
			expect(await mockStorage.listFiles()).toContain('search_meta.json');
		});

		it('should support string storage configuration: "node|browser"', async () => {
			// 强制使用 NodeStorage (在测试环境中应当有效)
			// noinspection SuspiciousTypeOfGuard
			const nodeEngine = new SearchEngine({
				baseDir: getTestBaseDir('storage') + '_node',
				storage: navigator?.storage?.getDirectory instanceof Function ? 'browser' : 'node'
			});
			await nodeEngine.clearAll();
			await nodeEngine.addDocument({id: 1, text: 'node test'});
			const res = await nodeEngine.search('node');
			expect(res.length).toBe(1);
		});
	});

	describe('Tokenizer Configuration', () => {
		it('should support separate indexing and search tokenizers', async () => {
			const customEngine = new SearchEngine({
				baseDir: getTestBaseDir('tokenizer') + '_custom',
				indexingTokenizer: (t) => t.split(' '),
				searchTokenizer: (t) => t.split(',')
			});
			await customEngine.clearAll();
			await customEngine.addDocument({id: 1, text: "hello world"});

			const res = await customEngine.search("hello,world");
			expect(res.length).toBe(1);
			expect(res[0].tokens.sort()).toEqual(['hello', 'world']);
		});
	});

	describe('Segment Threshold Configuration', () => {
		it('should respect wordSegmentTokenThreshold', async () => {
			// 创建两个不同的分词器，分别产生5个和2个token
			const tokenizer5 = (text: string) => ['t1', 't2', 't3', 't4', 't5'];
			const tokenizer2 = (text: string) => ['t6', 't7'];
			
			const mockStorage = new MockStorage();
			
			// 1. 先使用产生5个token的分词器
			const engine1 = new SearchEngine({
				baseDir: getTestBaseDir('threshold'),
				storage: mockStorage,
				wordSegmentTokenThreshold: 5, // 小阈值，便于测试
				minWordTokenSave: 0, // 确保立即保存
				indexingTokenizer: tokenizer5
			});

			// 添加第一个文档 (5个精确token) - 刚好达到阈值
			await engine1.addDocument({id: 1, text: "dummy text"});
			let files = await mockStorage.listFiles();
			let wordSegFiles = files.filter(f => f.includes('word_seg_'));
			const firstSegmentCount = wordSegFiles.length;

			// 2. 再使用产生2个token的分词器
			const engine2 = new SearchEngine({
				baseDir: getTestBaseDir('threshold'),
				storage: mockStorage,
				wordSegmentTokenThreshold: 5,
				minWordTokenSave: 0,
				indexingTokenizer: tokenizer2
			});
			
			// 添加第二个文档 (2个精确token)
			// 此时第一个segment已经达到阈值(5)，添加2个token后累计7个，应该创建新的segment
			await engine2.addDocument({id: 2, text: "dummy text 2"});
			files = await mockStorage.listFiles();
			wordSegFiles = files.filter(f => f.includes('word_seg_'));
			
			// 验证是否创建了新的索引文件
			expect(wordSegFiles.length).toBeGreaterThan(firstSegmentCount);
		});

		it('should respect charSegmentTokenThreshold', async () => {
			const mockStorage = new MockStorage();
			
			// 自定义字符分词器，直接返回固定数量的token
			let charTokenCount = 0;
			const customCharTokenizer = () => {
				if (charTokenCount === 0) {
					charTokenCount++;
					return ['a', 'b', 'c', 'd', 'e']; // 5个token
				} else {
					return ['f', 'g']; // 2个token
				}
			};
			
			const engine = new SearchEngine({
				baseDir: getTestBaseDir('char-threshold'),
				storage: mockStorage,
				charSegmentTokenThreshold: 5, // 小阈值，便于测试
				minCharTokenSave: 0, // 确保立即保存
				indexingTokenizer: customCharTokenizer
			});

			// 添加第一个文档 (5个精确字符token) - 刚好达到阈值
			await engine.addDocument({id: 1, text: "abcde"});
			let files = await mockStorage.listFiles();
			let charSegFiles = files.filter(f => f.includes('char_seg_'));
			const firstSegmentCount = charSegFiles.length;

			// 添加第二个文档 (2个精确字符token)
			// 此时第一个segment已经达到阈值(5)，添加2个token后累计7个，应该创建新的segment
			await engine.addDocument({id: 2, text: "fg"});
			files = await mockStorage.listFiles();
			charSegFiles = files.filter(f => f.includes('char_seg_'));
			
			// 验证是否创建了新的索引文件
			expect(charSegFiles.length).toBeGreaterThan(firstSegmentCount);
		});
	});

	describe('Min Token Save Configuration', () => {
		it('should respect minWordTokenSave threshold', async () => {
			const mockStorage = new MockStorage();
			const engine = new SearchEngine({
				baseDir: getTestBaseDir('min-save'),
				storage: mockStorage,
				minWordTokenSave: 5, // 设置最小保存阈值为5
				// 确保token长度大于1，这样会被归类为wordTokens
				indexingTokenizer: (text) => text.split(' ')
			});

			// 1. 添加少量文档，未达到阈值，不应创建索引
			await engine.addDocument({id: 1, text: "aa bb cc"}); // 3 tokens (每个长度2)
			let files = await mockStorage.listFiles();
			let wordSegFiles = files.filter(f => f.includes('word_seg_'));
			expect(wordSegFiles.length).toBe(0);

			// 2. 继续添加文档，达到阈值，应创建索引
			await engine.addDocument({id: 2, text: "dd ee ff"}); // 另外3 tokens，总计6
			files = await mockStorage.listFiles();
			wordSegFiles = files.filter(f => f.includes('word_seg_'));
			expect(wordSegFiles.length).toBeGreaterThan(0);
		});

		it('should respect minCharTokenSave threshold', async () => {
			const mockStorage = new MockStorage();
			const engine = new SearchEngine({
				baseDir: getTestBaseDir('min-save'),
				storage: mockStorage,
				minCharTokenSave: 5, // 设置最小保存阈值为5
				indexingTokenizer: (text) => text.split('').filter(char => char.trim() !== '')
			});

			// 1. 添加少量文档，未达到阈值，不应创建索引
			await engine.addDocument({id: 1, text: "abc"}); // 3 tokens
			let files = await mockStorage.listFiles();
			let charSegFiles = files.filter(f => f.includes('char_seg_'));
			expect(charSegFiles.length).toBe(0);

			// 2. 继续添加文档，达到阈值，应创建索引
			await engine.addDocument({id: 2, text: "def"}); // 另外3 tokens，总计6
			files = await mockStorage.listFiles();
			charSegFiles = files.filter(f => f.includes('char_seg_'));
			expect(charSegFiles.length).toBeGreaterThan(0);
		});
	});

	describe('Search Configuration', () => {
		it('should respect search result limit parameter', async () => {
			const engine = new SearchEngine({
				baseDir: getTestBaseDir('search'),
				wordSegmentTokenThreshold: 10
			});
			await engine.clearAll();

			await engine.addDocuments([
				{id: 1, text: "limit test A"},
				{id: 2, text: "limit test B"},
				{id: 3, text: "limit test C"}
			]);

			const res2 = await engine.search("limit", 2);
			expect(res2.length).toBe(2);
		});
	});
});
