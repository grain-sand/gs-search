// 基础哈希算法接口
export interface IHashAlgorithm<T> {
  /**
   * 计算字符串的哈希值
   * @param str 输入字符串
   * @returns 哈希值
   */
  hash(str: string): T;
}

// 32位哈希算法接口（返回number类型）
export interface IHashAlgorithm32 extends IHashAlgorithm<number> {}

// 64位哈希算法接口（返回bigint类型）
export interface IHashAlgorithm64 extends IHashAlgorithm<bigint> {}

// 128位哈希算法接口（返回bigint类型）
export interface IHashAlgorithm128 extends IHashAlgorithm<bigint> {}

// 哈希算法工厂接口
export interface IHashAlgorithmFactory {
  /**
   * 创建32位哈希算法实例
   */
  create32(): IHashAlgorithm32;
  
  /**
   * 创建64位哈希算法实例
   */
  create64(): IHashAlgorithm64;
  
  /**
   * 创建128位哈希算法实例
   */
  create128(): IHashAlgorithm128;
}
