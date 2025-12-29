// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';
import { getTestBaseDir, cleanupTestDirs } from './common/utils';

describe('Min Token Save Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		await cleanupTestDirs(['min-save']);
	});

	it('should respect minWordTokenSave threshold', async () => {
		const mockStorage = new MockStorage();
		const engine = new SearchEngine({
			baseDir: getTestBaseDir('min-save'),
			storage: mockStorage,
			minWordTokenSave: 5, // 设置最小保存阈值为5
			// 确保token长度大于1，这样会被归类为wordTokens
			indexingTokenizer: (doc) => doc.text.split(' ')
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
			indexingTokenizer: (doc) => doc.text.split('').filter(char => char.trim() !== '')
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
