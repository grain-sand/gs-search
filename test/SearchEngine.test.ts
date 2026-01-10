// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {SearchEngine} from '../src';
import {MockStorage} from './common/storage';

describe('SearchEngine', () => {
	let engine: SearchEngine;
	let mockStorage: MockStorage;

	beforeEach(async () => {
		mockStorage = new MockStorage();
		engine = new SearchEngine({
			storage: mockStorage,
			wordSegmentTokenThreshold: 50
		});
		await engine.clearAll();
	});

	afterAll(async () => {
		// 使用MockStorage不需要清理文件系统
	});



	it('已删除的文档ID不能重新添加', async () => {
		// 添加文档
		await engine.addDocument({id: 100, text: "test document"});
		let res = await engine.search<any>("test");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe(100);

		// 删除文档
		await engine.removeDocument(100);
		res = await engine.search<any>("test");
		expect(res.length).toBe(0);

		// 尝试重新添加，应该抛出异常
		await expect(engine.addDocument({id: 100, text: "re-added document"})).rejects.toThrow(
			"Document ID 100 has been deleted and cannot be re-added."
		);
	});

	it('addDocumentIfMissing 应该添加新文档', async () => {
		// 添加新文档
		await engine.addDocumentIfMissing({id: 200, text: "new document"});
		const res = await engine.search<any>("new");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe(200);
	});

	it('addDocumentIfMissing 应该跳过已存在的文档', async () => {
		// 先添加文档
		await engine.addDocument({id: 300, text: "existing document"});
		// 尝试再次添加相同ID的文档，应该不会抛出异常
		await expect(engine.addDocumentIfMissing({id: 300, text: "updated document"})).resolves.not.toThrow();
		// 搜索结果应该只有一个
		const res = await engine.search<any>("document");
		expect(res.length).toBe(1);
	});

	it('addDocumentIfMissing 应该跳过已删除的文档', async () => {
		// 先添加文档
		await engine.addDocument({id: 400, text: "to be deleted"});
		// 删除文档
		await engine.removeDocument(400);
		// 尝试重新添加相同ID的文档，应该不会抛出异常
		await expect(engine.addDocumentIfMissing({id: 400, text: "re-added document"})).resolves.not.toThrow();
		// 搜索结果应该为空
		const res = await engine.search<any>("re-added");
		expect(res.length).toBe(0);
	});

	it('addDocumentsIfMissing 应该添加新文档并跳过已存在的文档', async () => {
		// 先添加一个文档
		await engine.addDocument({id: 500, text: "already exists"});
		// 批量添加，包含已存在的和新的文档
		await engine.addDocumentsIfMissing([
			{id: 500, text: "should be skipped"},
			{id: 501, text: "new document 1"},
			{id: 502, text: "new document 2"}
		]);
		// 搜索结果应该有3个
		const res = await engine.search<any>("document");
		expect(res.length).toBe(2);
		// 验证文档ID
		const ids = res.map(doc => doc.id);
		expect(ids).toContain(501);
		expect(ids).toContain(502);
	});

	it('addDocumentsIfMissing 在批处理模式下应该正常工作', async () => {
		// 开始批处理
		engine.startBatch();
		// 先添加一些文档
		await engine.addDocuments([
			{id: 600, text: "batch document 1"},
			{id: 601, text: "batch document 2"}
		]);
		// 使用 addDocumentsIfMissing 添加文档，包含已存在的和新的
		await engine.addDocumentsIfMissing([
			{id: 600, text: "should be skipped"},
			{id: 602, text: "new batch document"}
		]);
		// 结束批处理
		await engine.endBatch();
		// 搜索结果应该有3个
		const res = await engine.search<any>("batch");
		expect(res.length).toBe(3);
		// 验证文档ID
		const ids = res.map(doc => doc.id);
		expect(ids).toContain(600);
		expect(ids).toContain(601);
		expect(ids).toContain(602);
	});
});
