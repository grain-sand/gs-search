import {BrowserStorage} from '../browser';
import {NodeStorage} from '../node';
import {MetaManager} from './MetaManager';
import {IntermediateCache} from './IntermediateCache';
import {IndexSegment} from './IndexSegment';
import {IDocument, IDocumentBase, IResult, ITokenizedDoc, ISearchEngineConfig, IndexType, IStorage} from '../type';

const WORD_CACHE_FILE = 'word_cache.bin';
const CHAR_CACHE_FILE = 'char_cache.bin';

/**
 * 核心搜索引擎类 (多实例支持)
 */
export class SearchEngine {
	#storage: IStorage;
	#meta: MetaManager;
	#cache: IntermediateCache;
	#segments: Map<string, IndexSegment>;
	#initialized: boolean = false;
	#config: ISearchEngineConfig;

	// 批处理状态
	#inBatch: boolean = false;
	#pendingTokenCounts: { word: number, char: number } = {word: 0, char: 0};

	constructor(config: ISearchEngineConfig) {
		if (!config.baseDir) {
			throw new Error("SearchEngine requires 'baseDir' in config.");
		}
		this.#config = {
			wordSegmentTokenThreshold: 100000,
			charSegmentTokenThreshold: 500000,
			minWordTokenSave: 0,
			minCharTokenSave: 0,
			...config
		};

		// 验证配置关系
		if ((this.#config.minWordTokenSave || 0) >= (this.#config.wordSegmentTokenThreshold || 100000)) {
			throw new Error("minWordTokenSave must be less than wordSegmentTokenThreshold");
		}
		if ((this.#config.minCharTokenSave || 0) >= (this.#config.charSegmentTokenThreshold || 500000)) {
			throw new Error("minCharTokenSave must be less than charSegmentTokenThreshold");
		}

		if (!this.#config.storage) {
			// noinspection SuspiciousTypeOfGuard
			if (typeof navigator !== 'undefined' && navigator?.storage?.getDirectory instanceof Function) {
				this.#config.storage = 'browser';
			} else {
				this.#config.storage = 'node';
			}
		}

		// 【升级】存储层配置逻辑
		// 优先级：配置对象(IStorage) > 配置字符串('browser'|'node') > 自动环境检测
		let storageImpl: IStorage | null = null;
		if (typeof this.#config.storage === 'object') {
			storageImpl = this.#config.storage;
		} else if (this.#config.storage === 'browser') {
			storageImpl = new BrowserStorage(this.#config.baseDir);
		} else if (this.#config.storage === 'node') {
			storageImpl = new NodeStorage(this.#config.baseDir);
		}

		// 如果仍未获取到实现，抛出异常
		if (!storageImpl) {
			throw new Error('Storage initialization failed. Please configure "storage" explicitly or ensure you are in a supported environment (Browser/Node).');
		}

		this.#storage = storageImpl;

		// 依赖注入
		this.#meta = new MetaManager(this.#storage);
		this.#cache = new IntermediateCache(this.#storage);
		this.#segments = new Map();
	}

	async init() {
		if (this.#initialized) return;
		await this.#meta.load();

		const allSegments = [
			...this.#meta.getSegments('word'),
			...this.#meta.getSegments('char')
		];

		// 预加载所有相关的索引段并加载数据
		for (const seg of allSegments) {
			if (!this.#segments.has(seg.filename)) {
				this.#segments.set(seg.filename, new IndexSegment(seg.filename, this.#storage));
			}
			// 确保索引段已加载数据
			await this.#segments.get(seg.filename)!.loadIndex();
		}
		this.#initialized = true;
	}

	/**
	 * 开启批处理
	 * 批处理期间 addDocuments 只写入缓存，不触发索引段构建
	 */
	startBatch() {
		this.#inBatch = true;
		this.#pendingTokenCounts = {word: 0, char: 0};
	}

	/**
	 * 结束批处理
	 * 触发索引构建检查并保存元数据
	 */
	async endBatch() {
		this.#inBatch = false;

		// 检查是否有挂起的数据需要处理
		if (this.#pendingTokenCounts.word > 0) {
			await this.#processSegmentLogic('word', this.#pendingTokenCounts.word);
		}
		if (this.#pendingTokenCounts.char > 0) {
			await this.#processSegmentLogic('char', this.#pendingTokenCounts.char);
		}

		this.#pendingTokenCounts = {word: 0, char: 0};
		await this.#meta.save();
	}

	async addDocument<T extends IDocument = IDocument>(doc: T): Promise<void> {
		return this.addDocuments([doc]);
	}

	/**
	 * 添加单个文档，如果文档ID已存在则跳过
	 * 用于在批量添加中途出错后的恢复添加行为，也可直接用于单个文档添加
	 */
	async addDocumentIfMissing<T extends IDocument = IDocument>(doc: T): Promise<void> {
		return this.addDocumentsIfMissing([doc]);
	}

	/**
	 * 添加多个文档，跳过已存在的文档ID
	 * 用于在批量添加中途出错后的恢复添加行为，也可直接用于批量添加
	 */
	async addDocumentsIfMissing<T extends IDocument = IDocument>(docs: T[]): Promise<void> {
		if (!this.#initialized) await this.init();
		if (docs.length === 0) return;

		const deletedIds = this.#meta.getDeletedIds();
		const batchWordDocs: ITokenizedDoc[] = [];
		const batchCharDocs: ITokenizedDoc[] = [];
		const newDocs: T[] = [];

		// 1. 分词与分类，跳过已存在或已删除的文档
		for (const doc of docs) {
			// 检查文档ID是否已被删除
			if (deletedIds.has(doc.id)) {
				continue;
			}
			// 检查文档ID是否已存在
			if (this.#meta.isAdded(doc.id)) {
				continue;
			}
			const rawTokens = this.#getIndexingTokens(doc);
			const wordTokens: string[] = [];
			const charTokens: string[] = [];

			for (const t of rawTokens) {
				if (t.length > 1) {
					wordTokens.push(t);
				} else if (t.length === 1) {
					charTokens.push(t);
				}
			}

			if (wordTokens.length > 0) batchWordDocs.push({id: doc.id, tokens: wordTokens});
			if (charTokens.length > 0) batchCharDocs.push({id: doc.id, tokens: charTokens});
			newDocs.push(doc);
		}

		// 如果没有新文档需要添加，直接返回
		if (newDocs.length === 0) return;

		// 2. 写入 Cache (必须立即持久化以防丢失)
		let addedWordTokens = 0;
		let addedCharTokens = 0;

		if (batchWordDocs.length > 0) {
			await this.#cache.appendBatch(WORD_CACHE_FILE, batchWordDocs);
			for (const d of batchWordDocs) addedWordTokens += d.tokens.length;
		}

		if (batchCharDocs.length > 0) {
			await this.#cache.appendBatch(CHAR_CACHE_FILE, batchCharDocs);
			for (const d of batchCharDocs) addedCharTokens += d.tokens.length;
		}

		// 更新已添加ID集合
		for (const doc of newDocs) {
			this.#meta.addAddedId(doc.id);
		}

		// 3. 处理逻辑分支
		if (this.#inBatch) {
			// 批处理模式：累加计数，暂不处理 Segment
			this.#pendingTokenCounts.word += addedWordTokens;
			this.#pendingTokenCounts.char += addedCharTokens;
		} else {
			// 实时模式：立即处理并保存
			if (addedWordTokens > 0) await this.#processSegmentLogic('word', addedWordTokens);
			if (addedCharTokens > 0) await this.#processSegmentLogic('char', addedCharTokens);
			await this.#meta.save();
		}
	}

	async addDocuments<T extends IDocument = IDocument>(docs: T[]): Promise<void> {
		if (!this.#initialized) await this.init();
		if (docs.length === 0) return;

		const deletedIds = this.#meta.getDeletedIds();
		const batchWordDocs: ITokenizedDoc[] = [];
		const batchCharDocs: ITokenizedDoc[] = [];

		// 1. 分词与分类
		for (const doc of docs) {
			// 检查文档ID是否已被删除
			if (deletedIds.has(doc.id)) {
				throw new Error(`Document ID ${doc.id} has been deleted and cannot be re-added.`);
			}
			// 检查文档ID是否已存在
			if (this.#meta.isAdded(doc.id)) {
				throw new Error(`Document ID ${doc.id} already exists.`);
			}
			const rawTokens = this.#getIndexingTokens(doc);
			const wordTokens: string[] = [];
			const charTokens: string[] = [];

			for (const t of rawTokens) {
				if (t.length > 1) {
					wordTokens.push(t);
				} else if (t.length === 1) {
					charTokens.push(t);
				}
			}

			if (wordTokens.length > 0) batchWordDocs.push({id: doc.id, tokens: wordTokens});
			if (charTokens.length > 0) batchCharDocs.push({id: doc.id, tokens: charTokens});
		}

		// 2. 写入 Cache (必须立即持久化以防丢失)
		let addedWordTokens = 0;
		let addedCharTokens = 0;

		if (batchWordDocs.length > 0) {
			await this.#cache.appendBatch(WORD_CACHE_FILE, batchWordDocs);
			for (const d of batchWordDocs) addedWordTokens += d.tokens.length;
		}

		if (batchCharDocs.length > 0) {
			await this.#cache.appendBatch(CHAR_CACHE_FILE, batchCharDocs);
			for (const d of batchCharDocs) addedCharTokens += d.tokens.length;
		}

		// 更新已添加ID集合
		for (const doc of docs) {
			this.#meta.addAddedId(doc.id);
		}

		// 3. 处理逻辑分支
		if (this.#inBatch) {
			// 批处理模式：累加计数，暂不处理 Segment
			this.#pendingTokenCounts.word += addedWordTokens;
			this.#pendingTokenCounts.char += addedCharTokens;
		} else {
			// 实时模式：立即处理并保存
			if (addedWordTokens > 0) await this.#processSegmentLogic('word', addedWordTokens);
			if (addedCharTokens > 0) await this.#processSegmentLogic('char', addedCharTokens);
			await this.#meta.save();
		}
	}

	async search<T extends IDocumentBase = IDocumentBase>(query: T | string, limit?: number): Promise<IResult[]> {
		if (!this.#initialized) await this.init();

		// Convert string query to IDocumentBase
		const queryDoc = typeof query === 'string' ? {text: query} : query;
		const rawTokens = this.#getSearchTokens(queryDoc);
		const wordTerms = rawTokens.filter(t => t.length > 1);
		const charTerms = rawTokens.filter(t => t.length === 1);

		const deletedIds = this.#meta.getDeletedIds();
		const docMatches = new Map<number, { score: number, tokens: Set<string> }>();

		// 预加载所有需要的索引段
		const segmentsToLoad = new Map<string, IndexSegment>();

		// 收集所有需要的索引段
		const collectSegments = (type: IndexType) => {
			const segmentsMeta = this.#meta.getSegments(type);
			for (const meta of segmentsMeta) {
				const filename = meta.filename;
				if (!this.#segments.has(filename) && !segmentsToLoad.has(filename)) {
					segmentsToLoad.set(filename, new IndexSegment(filename, this.#storage));
				}
			}
		};

		collectSegments('word');
		collectSegments('char');

		// 批量加载索引段
		await Promise.all(
			Array.from(segmentsToLoad.entries()).map(([filename, segment]) => {
				return segment.loadIndex().then(loaded => {
					if (loaded) this.#segments.set(filename, segment);
				});
			})
		);

		const processTerms = async (type: IndexType, terms: string[]) => {
			if (terms.length === 0) return;
			const segmentsMeta = this.#meta.getSegments(type);

			for (const meta of segmentsMeta) {
				const filename = meta.filename;
				const segment = this.#segments.get(filename);
				if (!segment) continue;

				for (const term of terms) {
					const hits = segment.search(term);
					const termScore = 1 + (term.length * 0.1);

					for (const id of hits) {
						if (deletedIds.has(id)) continue;
						if (!docMatches.has(id)) {
							docMatches.set(id, {score: 0, tokens: new Set([term])});
						} else {
							const match = docMatches.get(id)!;
							match.score += termScore;
							match.tokens.add(term);
						}
					}
				}
			}
		};

		await processTerms('word', wordTerms);
		await processTerms('char', charTerms);

		// 转换结果并排序
		const results: IResult[] = [];
		docMatches.forEach((data, id) => {
			results.push({
				id,
				score: data.score,
				tokens: Array.from(data.tokens)
			});
		});

		// 优化排序：使用更高效的排序算法并限制结果数量
		results.sort((a, b) => b.score - a.score);

		if (typeof limit === 'number' && limit > 0) {
			return results.slice(0, limit);
		}

		return results;
	}

	async removeDocument(id: number): Promise<void> {
		if (!this.#initialized) await this.init();
		this.#meta.addDeletedId(id);
		this.#meta.removeAddedId(id);
		await this.#meta.save();
	}

	async clearAll(): Promise<void> {
		await this.#storage.clearAll();
		this.#segments.clear();
		this.#meta.reset();
		this.#initialized = false;
		this.#inBatch = false;
		this.#pendingTokenCounts = {word: 0, char: 0};
	}

	async getStatus() {
		if (!this.#initialized) await this.init();
		return {
			wordSegments: this.#meta.getSegments('word').length,
			charSegments: this.#meta.getSegments('char').length,
			deleted: this.#meta.getDeletedIds().size,
			wordCacheSize: await this.#cache.getCurrentSize(WORD_CACHE_FILE),
			charCacheSize: await this.#cache.getCurrentSize(CHAR_CACHE_FILE),
			inBatch: this.#inBatch
		};
	}

	/**
	 * 检查文档ID是否曾经添加过（包括已删除的）
	 * @param id 文档ID
	 * @returns 文档是否曾经添加过的布尔值
	 */
	async hasDocument(id: number): Promise<boolean> {
		if (!this.#initialized) await this.init();
		return this.#meta.hasDocument(id);
	}

	#defaultTokenize(text: string): string[] {
		try {
			// 检查Intl.Segmenter是否可用且支持所需的功能
			if (typeof Intl !== 'undefined' &&
				typeof Intl.Segmenter === 'function' &&
				typeof Array.from === 'function') {
				const segmenter = new Intl.Segmenter([], {granularity: 'word'});
				const segments = segmenter.segment(text);
				if (typeof segments === 'object' && segments !== null) {
					return Array.from(segments)
						.filter((s: any) => s?.isWordLike)
						.map((s: any) => s?.segment?.toLowerCase() || '');
				}
			}
		} catch (e) {
			// 忽略任何Intl.Segmenter相关的错误，回退到基本分词
		}
		// 基本分词逻辑，确保在所有环境下都能工作
		return text.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/g).filter(t => t.length > 0);
	}

	#getIndexingTokens<T extends IDocument = IDocument>(doc: T): string[] {
		if (this.#config.indexingTokenizer) {
			return this.#config.indexingTokenizer(doc);
		}
		return this.#defaultTokenize(doc.text);
	}

	#getSearchTokens<T extends IDocumentBase = IDocumentBase>(doc: T): string[] {
		if (this.#config.searchTokenizer) {
			return this.#config.searchTokenizer(doc);
		}
		return this.#getIndexingTokens(doc as any);
	}

	/**
	 * 核心索引段处理逻辑
	 * 负责判断是否需要合并、新建 Segment，并执行构建
	 */
	async #processSegmentLogic(type: IndexType, addedTokenCount: number) {
		const cacheFilename = type === 'word' ? WORD_CACHE_FILE : CHAR_CACHE_FILE;
		const currentCacheSize = await this.#cache.getCurrentSize(cacheFilename);

		const segThreshold = type === 'word'
			? (this.#config.wordSegmentTokenThreshold || 100000)
			: (this.#config.charSegmentTokenThreshold || 500000);

		const minSave = type === 'word'
			? (this.#config.minWordTokenSave || 0)
			: (this.#config.minCharTokenSave || 0);

		const lastSegInfo = this.#meta.getLastSegmentInfo(type);

		let targetSegmentName: string;
		let startOffset: number;
		let isNew: boolean;
		let newTokenCountTotal: number;

		// 生成唯一的分段文件名（从1开始递增）
		const generateSegmentName = () => {
			const segments = this.#meta.getSegments(type);
			const nextNumber = segments.length + 1;
			return `${type}_seg_${nextNumber}.bin`;
		};

		// 逻辑：确定目标 Segment 和 数据范围
		if (!lastSegInfo) {
			// Case 1: 没有任何 Segment，这是第一个
			targetSegmentName = generateSegmentName();
			isNew = true;
			startOffset = 0;
			newTokenCountTotal = addedTokenCount;
		} else {
			const existingTokenCount = lastSegInfo.tokenCount;
			// 检查之前的 Segment 是否已经满了，或者加上新增的会超过阈值
			if (existingTokenCount >= segThreshold || (existingTokenCount + addedTokenCount) >= segThreshold) {
				// Case 2: 上一个满了，或者加上新增的会超过阈值，开启新的
				targetSegmentName = generateSegmentName();
				isNew = true;
				startOffset = lastSegInfo.end; // 新的起始位置是上一个的结束位置
				newTokenCountTotal = addedTokenCount;
			} else {
				// Case 3: 没满，合并到上一个
				targetSegmentName = lastSegInfo.filename;
				isNew = false;
				startOffset = lastSegInfo.start;
				newTokenCountTotal = existingTokenCount + addedTokenCount;
			}
		}

		// 如果未达到最小保存阈值，只更新元数据（记录 Cache 位置），不构建索引文件
		if (newTokenCountTotal < minSave) {
			this.#meta.updateSegment(type, targetSegmentName, startOffset, currentCacheSize, newTokenCountTotal, isNew);
			return;
		}

		// 需要构建索引：从 Cache 读取所需数据
		// 注意：Cache 中可能包含比我们需要更多的数据（如果是 Batch 模式），我们只读 [startOffset, currentCacheSize]
		const docsToBuild = await this.#cache.readRange(cacheFilename, startOffset, currentCacheSize);

		let segment = this.#segments.get(targetSegmentName);
		if (!segment) {
			segment = new IndexSegment(targetSegmentName, this.#storage);
			this.#segments.set(targetSegmentName, segment);
		}

		// 构建倒排索引并写入文件
		await segment.buildAndSave(docsToBuild);

		// 更新元数据
		this.#meta.updateSegment(type, targetSegmentName, startOffset, currentCacheSize, newTokenCountTotal, isNew);
	}
}
