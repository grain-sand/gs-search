import {CoreSearchEngine} from '../core/CoreSearchEngine';
import {IDocument, ISearchEngineConfig} from '../core/Types';

/**
 * 快速使用封装
 * 提供单例模式和默认配置
 */
export class SimpleSearch {
    static #instance: CoreSearchEngine | null = null;

    // 默认配置
    static #defaultConfig: ISearchEngineConfig = {
        baseDir: 'simple_search_data',
        wordSegmentTokenThreshold: 100000,
        minWordTokenSave: 0
    };

    /**
     * 配置并初始化单例
     */
    static configure(config: Partial<ISearchEngineConfig>) {
        const finalConfig: ISearchEngineConfig = {
            ...this.#defaultConfig,
            ...config
        };
        this.#instance = new CoreSearchEngine(finalConfig);
    }

    static #getInstance() {
        if (!this.#instance) {
            this.#instance = new CoreSearchEngine(this.#defaultConfig);
        }
        return this.#instance;
    }

    static async startTransaction() {
        this.#getInstance().startTransaction();
    }

    static async commitTransaction() {
        return this.#getInstance().commitTransaction();
    }

    static async addDocument(doc: IDocument) {
        return this.#getInstance().addDocument(doc);
    }

    static async addDocuments(docs: IDocument[]) {
        return this.#getInstance().addDocuments(docs);
    }

    static async search(query: string, limit?: number) {
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
}
