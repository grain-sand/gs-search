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
	it('add-data', async (): Promise<void> => {
		const data = [
			{
				id: 1,
				text: "其实很多修仙小说中的弱肉强食，只\\r\\n是作者把他们眼中看到的世界，用修仙小说为提材直白的表述出来了而已"
			},
			{id: 2, text: '世界还是美好的'},
			{id: 3, text: '可是'},
		]
		const engin = createEngine()
		await engin.addDocumentsIfMissing(data)
		await engin.endBatch();
	})
	it('reload', async (): Promise<void> => {
		const engin = createEngine()
		console.log(await engin.search<any>('可'))
	})
})
