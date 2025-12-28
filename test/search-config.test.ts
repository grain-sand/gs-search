// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { getTestBaseDir, cleanupTestDirs } from './common/utils';

describe('Search Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		await cleanupTestDirs(['search']);
	});

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
