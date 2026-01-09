/**
 * 索引类型
 */
export type IndexType = 'word' | 'char';

/**
 * 核心搜索引擎配置
 */
import {IDocument, IDocumentBase} from './IDocument';
import {IStorage} from './IStorage';

export type IndexingTokenizer = <T extends IDocument = IDocument>(doc: T) => string[];
export type SearchTokenizer = <T extends IDocumentBase = IDocumentBase>(doc: T) => string[];

export interface ISearchEngineConfig {
	/**
	 * 数据存储的基础目录 (必填)
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

	/**
	 * 索引时使用的分词器 (算法核心配置)
	 * - 作用: 将文档文本转换为索引用的token序列
	 * - 算法: 自定义实现的分词逻辑，需满足返回字符串数组的格式要求
	 * - 建议: 针对不同语言(中文/英文/日文等)使用专门的分词实现
	 * - 影响: 直接决定索引的粒度和搜索的准确性
	 */
	indexingTokenizer?: IndexingTokenizer;

	/**
	 * 搜索时使用的分词器 (算法核心配置)
	 * - 作用: 将查询文本转换为搜索用的token序列
	 * - 算法: 自定义实现的分词逻辑，需满足返回字符串数组的格式要求
	 * - 建议: 与indexingTokenizer保持一致的分词策略以确保搜索准确性
	 * - 影响: 直接决定搜索匹配的范围和结果的相关性
	 */
	searchTokenizer?: SearchTokenizer;

	/**
	 * 词索引分段阈值 (Token数) - 分段算法配置
	 * - 作用: 控制词索引文件的大小，超过阈值时创建新的索引段
	 * - 算法: 基于Token数量的分段策略，当新增Token数加上已有Token数超过阈值时触发分段
	 * - 默认值: 100000
	 * - 影响: 过小会导致索引文件过多，过大可能影响搜索性能
	 */
	wordSegmentTokenThreshold?: number;

	/**
	 * 字索引分段阈值 (Token数) - 分段算法配置
	 * - 作用: 控制字索引文件的大小，超过阈值时创建新的索引段
	 * - 算法: 基于Token数量的分段策略，当新增Token数加上已有Token数超过阈值时触发分段
	 * - 默认值: 500000
	 * - 影响: 过小会导致索引文件过多，过大可能影响搜索性能
	 */
	charSegmentTokenThreshold?: number;

	/**
	 * 词索引最小保存阈值 (Token数) - 缓存算法配置
	 * - 作用: 控制词索引是否立即写入磁盘，低于阈值时只保存在内存缓存中
	 * - 算法: 基于Token数量的缓存策略，当累计Token数达到阈值时才进行持久化
	 * - 默认值: 0
	 * - 影响: 适当设置可减少磁盘IO次数，提高索引性能
	 */
	minWordTokenSave?: number;

	/**
	 * 字索引最小保存阈值 (Token数) - 缓存算法配置
	 * - 作用: 控制字索引是否立即写入磁盘，低于阈值时只保存在内存缓存中
	 * - 算法: 基于Token数量的缓存策略，当累计Token数达到阈值时才进行持久化
	 * - 默认值: 0
	 * - 影响: 适当设置可减少磁盘IO次数，提高索引性能
	 */
	minCharTokenSave?: number;
}
