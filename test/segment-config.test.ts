// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';

describe('Segment Threshold Configuration', () => {
	// 使用MockStorage不需要清理测试目录
	afterAll(async () => {
		// 清理工作由MockStorage自动处理
	});

	it('should respect wordSegmentTokenThreshold', async () => {
		// 测试单词索引的分段阈值
		const mockStorage = new MockStorage();

		// 使用状态化的分词器，确保每次调用返回固定数量的token
		let tokenizerCalls = 0;
		const customTokenizer = (_text: string) => {
			tokenizerCalls++;
			// 每个文档返回3个token
			return ['apple', 'banana', 'cherry'];
		};

		const engine = new SearchEngine({
			storage: mockStorage,
			wordSegmentTokenThreshold: 5, // 设置较小的阈值
			minWordTokenSave: 0,
			indexingTokenizer: customTokenizer as any
		});

		// 添加第一个文档 (3个token)
		await engine.addDocument({ id: 1, text: 'apple banana cherry' });

		// 检查当前单词段文件数量
		let files = await mockStorage.listFiles();
		let wordSegFiles = files.filter(f => f.includes('word_seg_'));
		const firstSegmentCount = wordSegFiles.length;
		expect(firstSegmentCount).toBe(1); // 应该有1个单词段文件

		// 添加第二个文档 (3个token, 累计6个)
		await engine.addDocument({ id: 2, text: 'date elderberry fig' });

		// 检查是否创建了新的索引文件
		files = await mockStorage.listFiles();
		wordSegFiles = files.filter(f => f.includes('word_seg_'));
		expect(wordSegFiles.length).toBeGreaterThan(firstSegmentCount); // 应该有更多的单词段文件
	});

	it('should respect charSegmentTokenThreshold', async () => {
		// 测试字符索引的分段阈值
		const mockStorage = new MockStorage();

		// 跟踪分词器调用次数和返回的token
		let tokenizerCalls = 0;
		const customTokenizer = (_text: string) => {
			tokenizerCalls++;
			// 第一个文档返回3个token，第二个文档返回7个token（累计10个，超过阈值5）
			return tokenizerCalls === 1 ? ['a', 'b', 'c'] : ['e', 'f', 'g', 'h', 'i', 'j', 'k'];
		};

		const engine = new SearchEngine({
			storage: mockStorage,
			charSegmentTokenThreshold: 5,
			minCharTokenSave: 0,
			indexingTokenizer: customTokenizer as any
		});

		// 添加第一个文档 (3个token)
		await engine.addDocument({ id: 1, text: 'abc' });

		// 检查当前字符段文件数量
		let files = await mockStorage.listFiles();
		let charSegFiles = files.filter(f => f.includes('char_seg_'));
		const firstSegmentCount = charSegFiles.length;
		expect(firstSegmentCount).toBe(1); // 应该有1个字符段文件

		// 添加第二个文档 (7个token，累计10个，超过阈值5)
		await engine.addDocument({ id: 2, text: 'efghijk' });

		// 检查新增了字符段文件
		files = await mockStorage.listFiles();
		charSegFiles = files.filter(f => f.includes('char_seg_'));
		expect(charSegFiles.length).toBeGreaterThan(firstSegmentCount); // 应该有更多的字符段文件
	});
});
