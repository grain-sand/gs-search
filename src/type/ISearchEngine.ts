import {IDocument, IDocumentBase} from "./IDocument";
import {IResult} from "./IResult";

export interface ISearchEngineStatus {
	wordSegments: number
	charSegments: number
	deleted: number
	wordCacheSize: number
	charCacheSize: number
	inBatch: boolean
}

/**
 * 核心搜索引擎
 */
export interface ISearchEngine {

	init(): Promise<void>;

	/**
	 * 开启批处理
	 * 批处理期间 addDocuments 只写入缓存，不触发索引段构建
	 */
	startBatch(): void;

	/**
	 * 结束批处理
	 * 触发索引构建检查并保存元数据
	 */
	endBatch(): Promise<void>;

	addDocument<T extends IDocument = IDocument>(doc: T): Promise<void>;

	/**
	 * 添加单个文档，如果文档ID已存在则跳过
	 * 用于在批量添加中途出错后的恢复添加行为，也可直接用于单个文档添加
	 */
	addDocumentIfMissing<T extends IDocument = IDocument>(doc: T): Promise<void>;

	/**
	 * 添加多个文档，跳过已存在的文档ID
	 * 用于在批量添加中途出错后的恢复添加行为，也可直接用于批量添加
	 */
	addDocumentsIfMissing<T extends IDocument = IDocument>(docs: T[]): Promise<void>;

	addDocuments<T extends IDocument = IDocument>(docs: T[]): Promise<void>;

	search<T extends IDocumentBase = IDocumentBase>(query: T | string, limit?: number): Promise<IResult[]>;

	removeDocument(id: number): Promise<void>;

	clearAll(): Promise<void>;

	getStatus(): Promise<ISearchEngineStatus>;

	/**
	 * 检查文档ID是否曾经添加过（包括已删除的）
	 * @param id 文档ID
	 * @returns 文档是否曾经添加过的布尔值
	 */
	hasDocument(id: number): Promise<boolean>;


}
