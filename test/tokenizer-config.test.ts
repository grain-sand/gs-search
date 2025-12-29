// noinspection TypeScriptUnresolvedReference

import {afterAll, describe, expect, it} from 'vitest';
import {SearchEngine} from '../src';
import {cleanupTestDirs, getTestBaseDir} from './common/utils';

describe('Tokenizer Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		await cleanupTestDirs(['tokenizer']);
	});

	it('should support separate indexing and search tokenizers', async () => {
		const customEngine = new SearchEngine({
			baseDir: getTestBaseDir('tokenizer') + '_custom',
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
