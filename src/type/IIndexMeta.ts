/**
 * 索引元数据接口
 */
import { ISegmentMeta } from './ISegmentMeta';

export interface IIndexMeta {
    wordSegments: ISegmentMeta[];
    charSegments: ISegmentMeta[];
}
