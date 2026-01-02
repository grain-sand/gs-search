/**
 * MurmurHash3 32位实现
 * 高效的非加密哈希函数，适用于哈希表等数据结构
 */

/**
 * 计算字符串的32位MurmurHash3哈希值
 * @param str 要哈希的字符串
 * @param seed 哈希种子，默认为0x12345678（经过实践检验的非零种子，可减少哈希冲突）
 * @returns 32位无符号哈希值
 */
export function murmur3_32(str: string, seed: number = 0x12345678): number {
    let h = seed;
    const k1 = new Uint32Array(1);
    const data = new Uint8Array(new TextEncoder().encode(str));
    const len = data.length;
    const nBlocks = len >> 2; // len / 4

    // 处理4字节块
    for (let i = 0; i < nBlocks; i++) {
        const start = i << 2;
        k1[0] = (
            (data[start] & 0xff) |
            ((data[start + 1] & 0xff) << 8) |
            ((data[start + 2] & 0xff) << 16) |
            ((data[start + 3] & 0xff) << 24)
        );

        // 混合函数
        k1[0] *= 0xcc9e2d51;
        k1[0] = (k1[0] << 15) | (k1[0] >>> 17); // ROTL32(k1,15)
        k1[0] *= 0x1b873593;

        h ^= k1[0];
        h = (h << 13) | (h >>> 19); // ROTL32(h,13)
        h = h * 5 + 0xe6546b64;
    }

    // 处理剩余字节
    k1[0] = 0;
    const tailStart = nBlocks << 2;
    switch (len & 3) { // len % 4
        case 3:
            k1[0] ^= (data[tailStart + 2] & 0xff) << 16;
        case 2:
            k1[0] ^= (data[tailStart + 1] & 0xff) << 8;
        case 1:
            k1[0] ^= (data[tailStart] & 0xff);
            k1[0] *= 0xcc9e2d51;
            k1[0] = (k1[0] << 15) | (k1[0] >>> 17); // ROTL32(k1,15)
            k1[0] *= 0x1b873593;
            h ^= k1[0];
    }

    // 终结处理
    h ^= len;
    h ^= h >>> 16;
    h *= 0x85ebca6b;
    h ^= h >>> 13;
    h *= 0xc2b2ae35;
    h ^= h >>> 16;

    return h >>> 0;
}

// 导出murmur3_32作为主要哈希函数，移除重复的便捷函数
export { murmur3_32 as hash };
