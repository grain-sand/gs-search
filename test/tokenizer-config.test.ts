// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { getTestBaseDir, cleanupTestDirs } from './common/utils';

describe('Tokenizer Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		await cleanupTestDirs(['tokenizer']);
	});

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
