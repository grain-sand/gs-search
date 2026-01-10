import {IDocumentBase, IndexingTokenizer} from "../type";

export const defaultTokenize: IndexingTokenizer = ({text}: IDocumentBase) => {
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
