// noinspection TypeScriptUnresolvedReference

import { afterAll, describe, expect, it } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';
import { getTestBaseDir, cleanupTestDirs } from './common/utils';

describe('Storage Configuration', () => {
	// 清理测试目录
	afterAll(async () => {
		await cleanupTestDirs(['storage']);
	});

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
