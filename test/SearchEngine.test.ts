// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {SearchEngine} from '../src';

function getTestBaseDir() {
	let workerId = '0';
	if (typeof process !== 'undefined' && process.env) {
		workerId = process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0';
	}
	return `core_test_data_${workerId}`;
}



describe('SearchEngine', () => {
	let engine: SearchEngine;

	beforeEach(async () => {
		engine = new SearchEngine({
			baseDir: getTestBaseDir(),
			wordSegmentTokenThreshold: 50
		});
		await engine.clearAll();
	});

	afterAll(async () => {
		const base = getTestBaseDir();
		const dirsToClean = [base, base + '_node', base + '_custom'];
		// 仅在 Node.js 环境中执行清理
		if (typeof process !== 'undefined' && process.versions && process.versions.node) {
			try{
				const fs = await import('node:fs');
				dirsToClean.forEach(d => {
					if (fs.existsSync(d)) {
						try {
							fs.rmSync(d, {recursive: true, force: true});
						} catch (e) {
							console.error(`Failed to cleanup test dir ${d}:`, e);
						}
					}
				});
			} catch (e:any) {
				// Ignore errors in non-Node environments
			}
		}
	});



	it('已删除的文档ID不能重新添加', async () => {
		// 添加文档
		await engine.addDocument({id: 100, text: "test document"});
		let res = await engine.search("test");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe(100);

		// 删除文档
		await engine.removeDocument(100);
		res = await engine.search("test");
		expect(res.length).toBe(0);

		// 尝试重新添加，应该抛出异常
		await expect(engine.addDocument({id: 100, text: "re-added document"})).rejects.toThrow(
			"Document ID 100 has been deleted and cannot be re-added."
		);
	});
});
