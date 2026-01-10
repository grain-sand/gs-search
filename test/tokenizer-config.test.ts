// noinspection TypeScriptUnresolvedReference

import {afterAll, describe, expect, it} from 'vitest';
import {SearchEngine} from '../src';
import {MockStorage} from './common/storage';

describe('Tokenizer Configuration', () => {
	// 使用MockStorage不需要清理测试目录
	afterAll(async () => {
		// 清理工作由MockStorage自动处理
	});

	it('should support separate indexing and search tokenizers', async () => {
		const mockStorage = new MockStorage();
		const customEngine = new SearchEngine({
			storage: mockStorage,
			indexingTokenizer: (doc) => doc.text.split(' '),
			searchTokenizer: (doc) => doc.text.split(',')
		});
		await customEngine.clearAll();
		await customEngine.addDocument({id: 1, text: "hello world"});

		const res = await customEngine.search<any>("hello,world");
		expect(res.length).toBe(1);
		expect(res[0].tokens.sort()).toEqual(['hello', 'world']);
	});
});
