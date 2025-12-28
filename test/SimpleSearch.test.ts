// noinspection TypeScriptUnresolvedReference

import {beforeEach, describe, expect, it, afterAll} from 'vitest';
import {SimpleSearch} from '../src';

const baseDir = 'simple_test_data'

describe('SimpleSearch (Facade)', () => {
	beforeEach(async () => {
		SimpleSearch.configure({baseDir});
		await SimpleSearch.clearAll();
	});

	afterAll(async () => {
		try {
			const fs = await import('node:fs');
			fs.rmSync(baseDir, {recursive: true, force: true});
		} catch (e: any) {
		}
	});

	it('应支持事务操作', async () => {
		await SimpleSearch.startTransaction();
		await SimpleSearch.addDocument({id: 1, text: "batch test"});
		await SimpleSearch.commitTransaction();

		const res = await SimpleSearch.search("batch");
		expect(res.length).toBe(1);
	});
});
