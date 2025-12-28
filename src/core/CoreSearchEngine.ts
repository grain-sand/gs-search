import { BrowserStorage, NodeStorage } from './Storage';
import { MetaManager } from './MetaManager';
import { IntermediateCache } from './IntermediateCache';
import { IndexSegment } from './IndexSegment';
import { IDocument, IResult, ITokenizedDoc, ISearchEngineConfig, IndexType, IStorage } from './Types';

const WORD_CACHE_FILE = 'word_cache.bin';
const CHAR_CACHE_FILE = 'char_cache.bin';

/**
 * 核心搜索引擎类 (多实例支持)
 */
export class CoreSearchEngine {
    #storage: IStorage;
    #meta: MetaManager;
    #cache: IntermediateCache;
    #segments: Map<string, IndexSegment>;
    #initialized: boolean = false;
    #config: ISearchEngineConfig;

    // 批处理状态
    #inTransaction: boolean = false;
    #pendingTokenCounts: { word: number, char: number } = { word: 0, char: 0 };

    constructor(config: ISearchEngineConfig) {
        if (!config.baseDir) {
            throw new Error("CoreSearchEngine requires 'baseDir' in config.");
        }
        this.#config = {
            wordSegmentTokenThreshold: 100000,
            charSegmentTokenThreshold: 500000,
            minWordTokenSave: 0,
            minCharTokenSave: 0,
            ...config
        };

        // 【升级】存储层配置逻辑
        // 优先级：配置对象(IStorage) > 配置字符串('browser'|'node') > 自动环境检测
        let storageImpl: IStorage | null = null;

        if (this.#config.storage) {
            if (typeof this.#config.storage === 'object') {
                // Case 1: 直接传入 IStorage 实例
                storageImpl = this.#config.storage;
            } else if (this.#config.storage === 'browser') {
                // Case 2: 强制指定浏览器
                storageImpl = new BrowserStorage(this.#config.baseDir);
            } else if (this.#config.storage === 'node') {
                // Case 3: 强制指定 Node
                storageImpl = new NodeStorage(this.#config.baseDir);
            }
        }

        // Case 4: 自动检测 (当未配置 storage 时)
        if (!storageImpl) {
            // noinspection SuspiciousTypeOfGuard
            const isBrowser = typeof navigator !== 'undefined' && navigator?.storage?.getDirectory instanceof Function;
            // noinspection TypeScriptUnresolvedReference
            const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

            if (isBrowser) {
                storageImpl = new BrowserStorage(this.#config.baseDir);
            } else if (isNode) {
                storageImpl = new NodeStorage(this.#config.baseDir);
            }
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

        for (const seg of allSegments) {
            if (!this.#segments.has(seg.filename)) {
                this.#segments.set(seg.filename, new IndexSegment(seg.filename, this.#storage));
            }
        }
        this.#initialized = true;
    }

    /**
     * 开启批处理事务
     * 事务期间 addDocuments 只写入缓存，不触发索引段构建
     */
    startTransaction() {
        this.#inTransaction = true;
        this.#pendingTokenCounts = { word: 0, char: 0 };
    }

    /**
     * 提交事务
     * 触发索引构建检查并保存元数据
     */
    async commitTransaction() {
        this.#inTransaction = false;

        // 检查是否有挂起的数据需要处理
        if (this.#pendingTokenCounts.word > 0) {
            await this.#processSegmentLogic('word', this.#pendingTokenCounts.word);
        }
        if (this.#pendingTokenCounts.char > 0) {
            await this.#processSegmentLogic('char', this.#pendingTokenCounts.char);
        }

        this.#pendingTokenCounts = { word: 0, char: 0 };
        await this.#meta.save();
    }

    #defaultTokenize(text: string): string[] {
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            // @ts-ignore
            const segmenter = new Intl.Segmenter([], { granularity: 'word' });
            // @ts-ignore
            return Array.from(segmenter.segment(text))
                .filter((s: any) => s.isWordLike)
                .map((s: any) => s.segment.toLowerCase());
        }
        return text.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/g).filter(t => t.length > 0);
    }

    #getIndexingTokens(text: string): string[] {
        if (this.#config.indexingTokenizer) {
            return this.#config.indexingTokenizer(text);
        }
        return this.#defaultTokenize(text);
    }

    #getSearchTokens(text: string): string[] {
        if (this.#config.searchTokenizer) {
            return this.#config.searchTokenizer(text);
        }
        if (this.#config.indexingTokenizer) {
            return this.#config.indexingTokenizer(text);
        }
        return this.#defaultTokenize(text);
    }

    async addDocument(doc: IDocument): Promise<void> {
        return this.addDocuments([doc]);
    }

    async addDocuments(docs: IDocument[]): Promise<void> {
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
            const rawTokens = this.#getIndexingTokens(doc.text);
            const wordTokens: string[] = [];
            const charTokens: string[] = [];

            for (const t of rawTokens) {
                if (t.length > 1) {
                    wordTokens.push(t);
                } else if (t.length === 1) {
                    charTokens.push(t);
                }
            }

            if (wordTokens.length > 0) batchWordDocs.push({ id: doc.id, tokens: wordTokens });
            if (charTokens.length > 0) batchCharDocs.push({ id: doc.id, tokens: charTokens });
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

        // 3. 处理逻辑分支
        if (this.#inTransaction) {
            // 事务模式：累加计数，暂不处理 Segment
            this.#pendingTokenCounts.word += addedWordTokens;
            this.#pendingTokenCounts.char += addedCharTokens;
        } else {
            // 实时模式：立即处理并保存
            if (addedWordTokens > 0) await this.#processSegmentLogic('word', addedWordTokens);
            if (addedCharTokens > 0) await this.#processSegmentLogic('char', addedCharTokens);
            await this.#meta.save();
        }
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

        // 逻辑：确定目标 Segment 和 数据范围
        if (!lastSegInfo) {
            // Case 1: 没有任何 Segment，这是第一个
            targetSegmentName = `${type}_seg_${Date.now()}.bin`;
            isNew = true;
            startOffset = 0;
            newTokenCountTotal = addedTokenCount;
        } else {
            const existingTokenCount = lastSegInfo.tokenCount;
            // 检查之前的 Segment 是否已经满了
            if (existingTokenCount >= segThreshold) {
                // Case 2: 上一个满了，开启新的
                targetSegmentName = `${type}_seg_${Date.now()}.bin`;
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

    async search(query: string, limit?: number): Promise<IResult[]> {
        if (!this.#initialized) await this.init();

        const rawTokens = this.#getSearchTokens(query);
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
                            docMatches.set(id, { score: 0, tokens: new Set([term]) });
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
        await this.#meta.save();
    }

    async clearAll(): Promise<void> {
        await this.#storage.clearAll();
        this.#segments.clear();
        this.#meta.reset();
        this.#initialized = false;
        this.#inTransaction = false;
        this.#pendingTokenCounts = { word: 0, char: 0 };
    }

    async getStatus() {
        if (!this.#initialized) await this.init();
        return {
            wordSegments: this.#meta.getSegments('word').length,
            charSegments: this.#meta.getSegments('char').length,
            deleted: this.#meta.getDeletedIds().size,
            wordCacheSize: await this.#cache.getCurrentSize(WORD_CACHE_FILE),
            charCacheSize: await this.#cache.getCurrentSize(CHAR_CACHE_FILE),
            inTransaction: this.#inTransaction
        };
    }
}
