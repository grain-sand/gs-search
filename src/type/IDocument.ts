/**
 * 文档基础接口
 */
export interface IDocumentBase {
    text: string;
}

/**
 * 文档接口（包含ID）
 */
export interface IDocument extends IDocumentBase {
    id: number;
}
