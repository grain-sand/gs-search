// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';

describe('Search Configuration', () => {
	// 使用MockStorage不需要清理测试目录
	afterAll(async () => {
		// 清理工作由MockStorage自动处理
	});

	it('should respect search result limit parameter', async () => {
		const mockStorage = new MockStorage();
		const engine = new SearchEngine({
			storage: mockStorage,
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
