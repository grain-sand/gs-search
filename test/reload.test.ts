// noinspection ES6UnusedImports
// noinspection JSUnusedLocalSymbols

import {describe, it, expect} from "vitest";
import {BrowserStorage, ISearchEngineOption, NodeStorage, SearchEngine} from "../src";

const baseDir = 'tmp-reload.test'

function createEngine() {
	const config: Partial<ISearchEngineOption> = {
		indexingTokenizer: doc => Array.from(doc.text)
	}
	if (typeof navigator !== 'undefined' && navigator?.storage?.getDirectory instanceof Function) {
		config.storage = new BrowserStorage(baseDir);
	} else {
		config.storage = new NodeStorage(baseDir);
	}
	return new SearchEngine(config as ISearchEngineOption)
}

describe('reload.test', () => {
	it('should persist and reload data correctly', async (): Promise<void> => {
		const data = [
			{
				id: 1,
				text: "其实很多修仙小说中的弱肉强食，只\r\n是作者把他们眼中看到的世界，用修仙小说为提材直白的表述出来了而已"
			},
			{id: 2, text: '世界还是美好的'},
			{id: 3, text: '可是'},
		]
		
		// 添加数据
		const engine1 = createEngine()
		await engine1.addDocumentsIfMissing(data)
		await engine1.endBatch();
		
		// 重新加载并搜索
		const engine2 = createEngine()
		const results = await engine2.search<any>('可')
		console.log('Search results:', results)
		expect(results.length).toBeGreaterThan(0)
		expect(results.some(r => r.id === 3)).toBe(true)
	})
})
