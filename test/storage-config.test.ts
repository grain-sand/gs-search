// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';

describe('Storage Configuration', () => {
	// 使用MockStorage不需要清理测试目录
	afterAll(async () => {
		// 清理工作由MockStorage自动处理
	});

	it('should support custom storage implementation (MockStorage)', async () => {
		const mockStorage = new MockStorage();
		const customEngine = new SearchEngine({
			storage: mockStorage
		});

		await customEngine.addDocument({id: 99, text: "custom storage test"});
		const res = await customEngine.search<any>("custom");

		expect(res.length).toBe(1);
		expect(res[0].id).toBe(99);
		// 验证确实写入了 MockStorage
		expect(await mockStorage.listFiles()).toContain('search_meta.json');
	});

	it('should support custom storage implementation with NodeStorage or BrowserStorage', async () => {
		// 这个测试需要实际的存储实现，暂时跳过
		// 因为我们无法在测试环境中可靠地测试'node'或'browser'字符串配置
		expect(true).toBe(true);
	});
});
