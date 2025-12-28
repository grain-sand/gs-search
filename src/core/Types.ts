/**
 * 核心类型定义
 */

export interface IDocument {
    id: number;
    text: string;
}

export interface IResult {
    id: number;
    score: number;
    tokens: string[];
}

export interface ISegmentMeta {
    filename: string;
    start: number; // Cache 中的起始字节位置
    end: number;   // Cache 中的结束字节位置
    tokenCount: number;
}

export interface IIndexMeta {
    wordSegments: ISegmentMeta[];
    charSegments: ISegmentMeta[];
}

export interface ITokenizedDoc {
    id: number;
    tokens: string[];
}

export type IndexType = 'word' | 'char';

/**
 * 存储层接口 (外部化)
 */
export interface IStorage {
    write(filename: string, data: ArrayBuffer): Promise<void>;
    append(filename: string, data: ArrayBuffer): Promise<void>;
    read(filename: string): Promise<ArrayBuffer | null>;
    readRange(filename: string, start: number, end: number): Promise<ArrayBuffer | null>;
    remove(filename: string): Promise<void>;
    listFiles(): Promise<string[]>;
    clearAll(): Promise<void>;
    getFileSize(filename: string): Promise<number>;
}

/**
 * 核心搜索引擎配置
 */
export interface ISearchEngineConfig {
    /** * 数据存储的基础目录 (必填)
     * 用于区分不同的搜索引擎实例
     */
    baseDir: string;

    /**
     * 存储实现配置 (可选)
     * - 'browser': 强制使用 OPFS (BrowserStorage)
     * - 'node': 强制使用 Node.js fs (NodeStorage)
     * - IStorage: 传入自定义的存储实例
     * - undefined: 自动检测环境
     */
    storage?: 'browser' | 'node' | IStorage;

    /** * 索引时使用的分词器
     * 用于处理 addDocument 传入的文本
     */
    indexingTokenizer?: (text: string) => string[];

    /** * 搜索时使用的分词器
     * 用于处理 search 传入的查询语句
     */
    searchTokenizer?: (text: string) => string[];

    /** 词索引分段阈值 (Token数) */
    wordSegmentTokenThreshold?: number;
    /** 字索引分段阈值 (Token数) */
    charSegmentTokenThreshold?: number;
    /** 词索引最小保存阈值 (Token数) */
    minWordTokenSave?: number;
    /** 字索引最小保存阈值 (Token数) */
    minCharTokenSave?: number;
}
