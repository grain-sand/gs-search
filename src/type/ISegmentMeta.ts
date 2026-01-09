/**
 * 索引段元数据接口
 */
export interface ISegmentMeta {
    filename: string;
    start: number; // Cache 中的起始字节位置
    end: number;   // Cache 中的结束字节位置
    tokenCount: number;
}
