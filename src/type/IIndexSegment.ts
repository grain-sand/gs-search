/**
 * 索引段接口，定义了IndexSegment和IndexSegment64的共同方法
 */
import { ITokenizedDoc } from './ITokenizedDoc';
import { IHashAlgorithm32, IHashAlgorithm64 } from './IHashAlgorithm';

export interface IIndexSegment {
    /**
     * 使用当前哈希算法计算字符串哈希值
     * @param str 要哈希的字符串
     * @returns 哈希值（number | bigint）
     */
    hash(str: string): number | bigint;
    
    /**
     * 设置哈希算法
     * @param hashAlgorithm 新的哈希算法实例
     */
    setHashAlgorithm(hashAlgorithm: IHashAlgorithm32 | IHashAlgorithm64): void;
    
    /**
     * 加载索引
     * @returns 是否成功加载索引
     */
    loadIndex(): Promise<boolean>;
    
    /**
     * 构建并保存索引
     * @param docs 要索引的文档
     */
    buildAndSave(docs: ITokenizedDoc[]): Promise<void>;
    
    /**
     * 搜索索引
     * @param term 搜索词
     * @returns 匹配的文档ID数组
     */
    search(term: string): number[];
}
