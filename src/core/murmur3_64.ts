/**
 * MurmurHash3 64位实现
 * 高效的非加密哈希函数，适用于哈希表等数据结构
 */

/**
 * 计算字符串的64位MurmurHash3哈希值
 * @param str 要哈希的字符串
 * @param seed 种子值，默认为0x12345678
 * @returns 64位无符号哈希值（BigInt类型）
 */
export function murmur3_64(str: string, seed: number = 0x12345678): bigint {
    const len = str.length;
    const nBlocks = len >> 3; // len / 8

    let h1 = BigInt(seed);
    let h2 = BigInt(seed);

    const c1 = 0x87c37b91114253d5n;
    const c2 = 0x4cf5ad432745937fn;

    // 处理8字节块
    let i = 0;
    while (i < nBlocks) {
        let k1 = (
            BigInt(str.charCodeAt(i) & 0xff) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 8n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 16n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 24n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 32n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 40n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 48n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 56n)
        );
        ++i;

        let k2 = (
            BigInt(str.charCodeAt(i) & 0xff) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 8n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 16n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 24n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 32n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 40n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 48n) |
            (BigInt(str.charCodeAt(++i) & 0xff) << 56n)
        );
        ++i;

        // 混合函数
        k1 = (k1 * c1) % 2n ** 64n;
        k1 = ((k1 << 31n) | (k1 >> 33n)) % 2n ** 64n;
        k1 = (k1 * c2) % 2n ** 64n;
        h1 ^= k1;

        h1 = ((h1 << 27n) | (h1 >> 37n)) % 2n ** 64n;
        h1 = (h1 + h2) % 2n ** 64n;
        h1 = (h1 * 5n + 0x52dce729n) % 2n ** 64n;

        k2 = (k2 * c2) % 2n ** 64n;
        k2 = ((k2 << 33n) | (k2 >> 31n)) % 2n ** 64n;
        k2 = (k2 * c1) % 2n ** 64n;
        h2 ^= k2;

        h2 = ((h2 << 31n) | (h2 >> 33n)) % 2n ** 64n;
        h2 = (h2 + h1) % 2n ** 64n;
        h2 = (h2 * 5n + 0x38495ab5n) % 2n ** 64n;
    }

    // 处理剩余字节
    let k1 = 0n;
    let k2 = 0n;
    const remainder = len & 7; // len % 8
    if (remainder > 0) {
        if (remainder >= 8) k2 ^= BigInt(str.charCodeAt(i + 7) & 0xff) << 56n;
        if (remainder >= 7) k2 ^= BigInt(str.charCodeAt(i + 6) & 0xff) << 48n;
        if (remainder >= 6) k2 ^= BigInt(str.charCodeAt(i + 5) & 0xff) << 40n;
        if (remainder >= 5) k2 ^= BigInt(str.charCodeAt(i + 4) & 0xff) << 32n;
        if (remainder >= 4) k1 ^= BigInt(str.charCodeAt(i + 3) & 0xff) << 24n;
        if (remainder >= 3) k1 ^= BigInt(str.charCodeAt(i + 2) & 0xff) << 16n;
        if (remainder >= 2) k1 ^= BigInt(str.charCodeAt(i + 1) & 0xff) << 8n;
        if (remainder >= 1) k1 ^= BigInt(str.charCodeAt(i) & 0xff);

        k1 = (k1 * c1) % 2n ** 64n;
        k1 = ((k1 << 31n) | (k1 >> 33n)) % 2n ** 64n;
        k1 = (k1 * c2) % 2n ** 64n;
        h1 ^= k1;

        k2 = (k2 * c2) % 2n ** 64n;
        k2 = ((k2 << 33n) | (k2 >> 31n)) % 2n ** 64n;
        k2 = (k2 * c1) % 2n ** 64n;
        h2 ^= k2;
    }

    // 终结处理
    h1 ^= BigInt(len);
    h2 ^= BigInt(len);

    h1 = (h1 + h2) % 2n ** 64n;
    h2 = (h2 + h1) % 2n ** 64n;

    h1 = (h1 ^ (h1 >> 33n)) * 0xff51afd7ed558ccdn;
    h1 = (h1 ^ (h1 >> 33n)) * 0xc4ceb9fe1a85ec53n;
    h1 = h1 ^ (h1 >> 33n);

    h2 = (h2 ^ (h2 >> 33n)) * 0xff51afd7ed558ccdn;
    h2 = (h2 ^ (h2 >> 33n)) * 0xc4ceb9fe1a85ec53n;
    h2 = h2 ^ (h2 >> 33n);

    const result = (h2 << 64n) | h1;
    return result & 0xffffffffffffffffn;
}
