import {SearchEngine} from '../core/SearchEngine';
import {IDocument, IDocumentBase, ISearchEngineConfig} from '../core/Types';

/**
 * 快速使用封装
 * 提供单例模式和默认配置
 */
export class SimpleSearch {
    static #instance: SearchEngine | null = null;

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
        this.#instance = new SearchEngine(finalConfig);
    }

    static #getInstance():SearchEngine {
        if (!this.#instance) {
            this.#instance = new SearchEngine(this.#defaultConfig);
        }
        return this.#instance!;
    }

    static async startBatch() {
        this.#getInstance().startBatch();
    }

    static async endBatch() {
        return this.#getInstance().endBatch();
    }

    static async addDocument<T extends IDocument = IDocument>(doc: T) {
        return this.#getInstance().addDocument(doc);
    }

    static async addDocuments<T extends IDocument = IDocument>(docs: T[]) {
        return this.#getInstance().addDocuments(docs);
    }

    static async search<T extends IDocumentBase = IDocumentBase>(query: T | string, limit?: number) {
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
}
