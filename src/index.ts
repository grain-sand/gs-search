// 导出类型定义
export type {
	IDocument,
	IDocumentBase,
	IResult,
	ITokenizedDoc,
	ISearchEngineConfig,
	IndexType,
	IStorage,
	ISegmentMeta,
	IIndexMeta
} from './type';

export * from './core';
export * from './simple/SimpleSearch';
export * from './browser';
export * from './node';
