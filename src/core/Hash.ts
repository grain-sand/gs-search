/**
 * MurmurHash3 32位实现
 * 高效的非加密哈希函数，适用于哈希表等数据结构
 */

/**
 * 计算字符串的32位MurmurHash3哈希值
 * @param str 要哈希的字符串
 * @param h
 * @returns 32位无符号哈希值
 */
export function murmur3_32(str: string, h: number = 0x12345678): number {
    const len = str.length;
    const nBlocks = len >> 2; // len / 4

    // 处理4字节块
    let i = 0;
    while (i < nBlocks) {
        let k1 =
            ((str.charCodeAt(i) & 0xff)) |
            ((str.charCodeAt(++i) & 0xff) << 8) |
            ((str.charCodeAt(++i) & 0xff) << 16) |
            ((str.charCodeAt(++i) & 0xff) << 24);
        ++i;

        // 混合函数，使用与库实现相同的32位溢出处理
        k1 = ((((k1 & 0xffff) * 0xcc9e2d51) + ((((k1 >>> 16) * 0xcc9e2d51) & 0xffff) << 16))) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((((k1 & 0xffff) * 0x1b873593) + ((((k1 >>> 16) * 0x1b873593) & 0xffff) << 16))) & 0xffffffff;

        h ^= k1;
        h = (h << 13) | (h >>> 19);
        h = ((((h & 0xffff) * 5) + ((((h >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
        h = (((h & 0xffff) + 0x6b64) + ((((h >>> 16) + 0xe654) & 0xffff) << 16));
    }

    // 处理剩余字节
    let k1 = 0;
    const remainder = len & 3; // len % 4
    if (remainder > 0) {
        if (remainder >= 3) k1 ^= (str.charCodeAt(i + 2) & 0xff) << 16;
        if (remainder >= 2) k1 ^= (str.charCodeAt(i + 1) & 0xff) << 8;
        if (remainder >= 1) k1 ^= (str.charCodeAt(i) & 0xff);

        k1 = (((k1 & 0xffff) * 0xcc9e2d51) + ((((k1 >>> 16) * 0xcc9e2d51) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = (((k1 & 0xffff) * 0x1b873593) + ((((k1 >>> 16) * 0x1b873593) & 0xffff) << 16)) & 0xffffffff;
        h ^= k1;
    }

    // 终结处理
    h ^= len;
    h ^= h >>> 16;
    h = (((h & 0xffff) * 0x85ebca6b) + ((((h >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h ^= h >>> 13;
    h = ((((h & 0xffff) * 0xc2b2ae35) + ((((h >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h ^= h >>> 16;

    return h >>> 0;
}

// 导出murmur3_32作为主要哈希函数，移除重复的便捷函数
export { murmur3_32 as hash };
