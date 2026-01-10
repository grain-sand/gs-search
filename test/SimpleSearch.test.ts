// noinspection TypeScriptUnresolvedReference

import {beforeEach, describe, expect, it, afterAll} from 'vitest';
import {SimpleSearch} from '../src';
import {MockStorage} from './common/storage';

describe('SimpleSearch (Facade)', () => {
	beforeEach(async () => {
		// 使用MockStorage进行测试，避免文件系统操作
		SimpleSearch.configure({storage: new MockStorage()});
		await SimpleSearch.clearAll();
	});

	afterAll(async () => {
		// 使用MockStorage不需要清理文件系统
	});

	it('should support batch operations', async () => {
		await SimpleSearch.startBatch();
		try {
			await SimpleSearch.addDocument({id: 1, text: "batch test"});
		} finally {
			await SimpleSearch.endBatch();
		}

		const res = await SimpleSearch.search<any>("batch");
		expect(res.length).toBe(1);
	});
});
