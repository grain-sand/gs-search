import {SearchEngine} from '../core';
import {IDocument, IDocumentBase, ISearchEngineOption} from '../type';
import {BrowserStorage} from "../browser";
import {NodeStorage} from "../node";

const DefaultOption: Partial<ISearchEngineOption> = Object.freeze({
	wordSegmentTokenThreshold: 100000,
	minWordTokenSave: 0
})

const DefaultPath = 'simple-search';

/**
 * 快速使用封装
 * 提供单例模式和默认配置
 */
export class SimpleSearch {
	static #instance: SearchEngine | null = null;

	static #config?: ISearchEngineOption;

	static get config(): ISearchEngineOption {
		if (this.#config) {
			return this.#config;
		}
		const config = {...DefaultOption} as ISearchEngineOption;

		// noinspection SuspiciousTypeOfGuard
        if (typeof navigator !== 'undefined' && navigator?.storage?.getDirectory instanceof Function) {
			config.storage = new BrowserStorage(DefaultPath);
		} else {
			config.storage = new NodeStorage(DefaultPath);
		}
		return (this.#config = config);
	}

	/**
	 * 配置并初始化单例
	 */
	static configure(config: Partial<ISearchEngineOption>) {
		this.#config = {...this.config, ...config};
        if(this.#instance) {
            this.#instance = new SearchEngine(this.config);
        }
	}

	static async startBatch() {
		this.#getInstance().startBatch();
	}

	static async endBatch() {
		return this.#getInstance().endBatch();
	}

	static async addDocument(doc: IDocument) {
		return this.#getInstance().addDocument(doc);
	}

	static async addDocumentIfMissing(doc: IDocument) {
		return this.#getInstance().addDocumentIfMissing(doc);
	}

	static async addDocuments(docs: IDocument[]) {
		return this.#getInstance().addDocuments(docs);
	}

	static async addDocumentsIfMissing(docs: IDocument[]) {
		return this.#getInstance().addDocumentsIfMissing(docs);
	}

	static async search(query: IDocumentBase | string, limit?: number) {
		return this.#getInstance().search(query, limit);
	}

	static async removeDocument(id: number) {
		return this.#getInstance().removeDocument(id);
	}

	static async clearAll() {
		return this.#getInstance().clearAll();
	}

	static async getStatus() {
		return this.#getInstance().getStatus();
	}

	/**
	 * 检查文档ID是否曾经添加过（包括已删除的）
	 * @param id 文档ID
	 * @returns 文档是否曾经添加过的布尔值
	 */
	static async hasDocument(id: number): Promise<boolean> {
		return this.#getInstance().hasDocument(id);
	}

	static #getInstance(): SearchEngine {
		if (!this.#instance) {
			this.#instance = new SearchEngine(this.config);
		}
		return this.#instance!;
	}
}
