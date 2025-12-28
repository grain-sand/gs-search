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

	it('should support batch operations', async () => {
		await SimpleSearch.startBatch();
		await SimpleSearch.addDocument({id: 1, text: "batch test"});
		await SimpleSearch.endBatch();

		const res = await SimpleSearch.search("batch");
		expect(res.length).toBe(1);
	});
});
