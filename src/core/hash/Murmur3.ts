import {murmur3_32} from '../murmur3_32';
import {murmur3_64} from '../murmur3_64';
import {IHashAlgorithm128, IHashAlgorithm32, IHashAlgorithm64, IHashAlgorithmFactory} from '../../type';

/**
 * Murmur3 32位哈希算法实现类
 */
export class Murmur3_32 implements IHashAlgorithm32 {
  private seed: number;

  /**
   * 构造函数
   * @param seed 种子值，默认为0x12345678
   */
  constructor(seed: number = 0x12345678) {
    this.seed = seed;
  }

  /**
   * 计算字符串的32位哈希值
   * @param str 输入字符串
   * @returns 32位哈希值（number类型）
   */
  hash(str: string): number {
    return murmur3_32(str, this.seed);
  }
}

/**
 * Murmur3 64位哈希算法实现类
 */
export class Murmur3_64 implements IHashAlgorithm64 {
  private seed: number;

  /**
   * 构造函数
   * @param seed 种子值，默认为0x12345678
   */
  constructor(seed: number = 0x12345678) {
    this.seed = seed;
  }

  /**
   * 计算字符串的64位哈希值
   * @param str 输入字符串
   * @returns 64位哈希值（bigint类型）
   */
  hash(str: string): bigint {
    return murmur3_64(str, this.seed);
  }
}

/**
 * Murmur3 128位哈希算法实现类
 * 注意：当前项目中没有实际的128位实现，这里只是一个占位符
 */
export class Murmur3_128 implements IHashAlgorithm128 {
  private seed: number;

  /**
   * 构造函数
   * @param seed 种子值，默认为0x12345678
   */
  constructor(seed: number = 0x12345678) {
    this.seed = seed;
  }

  /**
   * 计算字符串的128位哈希值
   * @param str 输入字符串
   * @returns 128位哈希值（bigint类型）
   */
  hash(str: string): bigint {
    // 目前使用两个64位哈希值拼接成128位，实际项目中应该替换为真正的128位实现
    const hash1 = murmur3_64(str, this.seed);
    const hash2 = murmur3_64(str + str, this.seed ^ 0x5a5a5a5a);
    return (hash2 << 64n) | hash1;
  }
}

/**
 * Murmur3哈希算法工厂类
 */
export class Murmur3HashFactory implements IHashAlgorithmFactory {
  /**
   * 创建32位哈希算法实例
   * @returns 32位哈希算法实例
   */
  create32(): IHashAlgorithm32 {
    return new Murmur3_32();
  }

  /**
   * 创建64位哈希算法实例
   * @returns 64位哈希算法实例
   */
  create64(): IHashAlgorithm64 {
    return new Murmur3_64();
  }

  /**
   * 创建128位哈希算法实例
   * @returns 128位哈希算法实例
   */
  create128(): IHashAlgorithm128 {
    return new Murmur3_128();
  }
}

// 创建默认的哈希算法工厂实例
export const defaultHashFactory = new Murmur3HashFactory();
