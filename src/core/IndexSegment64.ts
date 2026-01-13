/**
 * 64位哈希索引段类
 */
import {IHashAlgorithm32, IHashAlgorithm64, IStorage, ITokenizedDoc, IIndexSegment} from '../type';
import {Murmur3_64} from './hash/Murmur3';

export class IndexSegment64 implements IIndexSegment {
	#filename: string;
	#storage: IStorage;
	#buffer: ArrayBuffer | null = null;
	#view: DataView | null = null;
	#hashAlgorithm: IHashAlgorithm64;

	/**
	 * 构造函数
	 * @param filename 文件名
	 * @param storage 存储接口
	 * @param hashAlgorithm 哈希算法实例，默认为Murmur3_64
	 */
	constructor(filename: string, storage: IStorage, hashAlgorithm: IHashAlgorithm64 = new Murmur3_64()) {
		this.#filename = filename;
		this.#storage = storage;
		this.#hashAlgorithm = hashAlgorithm;
	}

	/**
	 * 使用当前哈希算法计算字符串哈希值
	 * @param str 要哈希的字符串
	 * @returns 64位无符号哈希值
	 */
	hash(str: string): bigint {
		return this.#hashAlgorithm.hash(str);
	}

	/**
	 * 设置哈希算法
	 * @param hashAlgorithm 新的哈希算法实例
	 */
	setHashAlgorithm(hashAlgorithm: IHashAlgorithm32 | IHashAlgorithm64): void {
		this.#hashAlgorithm = hashAlgorithm as IHashAlgorithm64;
	}

	async loadIndex(): Promise<boolean> {
		if (this.#buffer) return true;
		this.#buffer = await this.#storage.read(this.#filename);
		if (this.#buffer) {
			this.#view = new DataView(this.#buffer);
			return true;
		}
		return false;
	}

	async buildAndSave(docs: ITokenizedDoc[]): Promise<void> {
		const tokenMap = new Map<string, { hash: bigint; postings: number[] }>();

		// 去重并构建 postings
		for (const doc of docs) {
			const uniqueTokens = new Map<string, boolean>();
			for (const token of doc.tokens) {
				if (!uniqueTokens.has(token)) {
					uniqueTokens.set(token, true);
					if (!tokenMap.has(token)) {
						tokenMap.set(token, {
							hash: this.hash(token),
							postings: []
						});
					}
					tokenMap.get(token)!.postings.push(doc.id);
				}
			}
		}

		// 按 hash 排序，hash 相同再按 token 排序
		const entries = Array.from(tokenMap.entries());
		entries.sort(([a, ah], [b, bh]) => {
			if (ah.hash !== bh.hash) return ah.hash > bh.hash ? 1 : -1;
			return a.localeCompare(b);
		});

		const encoder = new TextEncoder();

		// 计算所需空间（关键修正：按 UTF-8 字节数算）
		let totalPostings = 0;
		let totalTokensSize = 0;

		for (const [token, {postings}] of entries) {
			totalPostings += postings.length;
			const bytes = encoder.encode(token);
			totalTokensSize += bytes.length + 1; // +1 for null terminator
		}

		/*
		 结构：
		 Header: 16
		 Dict: entries.length * 28
		 Postings: totalPostings * 4
		 Tokens: totalTokensSize
		 */
		const headerSize = 16;
		const dictSize = entries.length * 28;
		const postingsSize = totalPostings * 4;
		const tokensOffset = headerSize + dictSize + postingsSize;
		const totalSize = tokensOffset + totalTokensSize;

		const buffer = new ArrayBuffer(totalSize);
		const view = new DataView(buffer);

		// Header
		view.setUint32(0, 0x494E4458);          // 'INDX'
		view.setUint32(4, entries.length, true);
		view.setUint32(8, tokensOffset, true);
		view.setUint32(12, 64, true);           // 64位哈希标志

		let currentDictOffset = headerSize;
		let currentPostingsOffset = headerSize + dictSize;
		let currentTokenOffset = tokensOffset;

		for (const [token, {hash, postings}] of entries) {
			// Dict entry
			view.setBigUint64(currentDictOffset, hash, true);
			const tokenBytes = encoder.encode(token);
			view.setUint32(currentDictOffset + 8, tokenBytes.length, true); // UTF-8字节长度
			view.setUint32(currentDictOffset + 12, currentTokenOffset, true);
			view.setUint32(currentDictOffset + 16, currentPostingsOffset, true);
			view.setUint32(currentDictOffset + 20, postings.length, true);
			currentDictOffset += 28;

			// Postings
			for (let i = 0; i < postings.length; i++) {
				view.setUint32(currentPostingsOffset, postings[i], true);
				currentPostingsOffset += 4;
			}

			// Token (UTF-8)
			for (let i = 0; i < tokenBytes.length; i++) {
				view.setUint8(currentTokenOffset++, tokenBytes[i]);
			}
			// Null terminator
			view.setUint8(currentTokenOffset++, 0);
		}

		await this.#storage.write(this.#filename, buffer);
		this.#buffer = buffer;
		this.#view = view;
	}

	search(term: string): number[] {
		if (!this.#view || !this.#buffer) return [];
		const h = this.hash(term);
		const count = this.#view.getUint32(4, true);

		let left = 0;
		let right = count - 1;
		const headerSize = 16;
		const entrySize = 28;
		const decoder = new TextDecoder();

		// 二分查找哈希值
		while (left <= right) {
			const mid = (left + right) >>> 1;
			const entryPos = headerSize + mid * entrySize;
			const entryHash = this.#view.getBigUint64(entryPos, true);

			if (entryHash < h) {
				left = mid + 1;
			} else if (entryHash > h) {
				right = mid - 1;
			} else {
				// 检查是否存在哈希冲突
				const hasConflict = (mid > 0 && this.#view.getBigUint64(headerSize + (mid - 1) * entrySize, true) === h) ||
					(mid < count - 1 && this.#view.getBigUint64(headerSize + (mid + 1) * entrySize, true) === h);

				if (!hasConflict) {
					// 无冲突，直接返回当前条目的postings
					const postingsOffset = this.#view.getUint32(headerSize + mid * entrySize + 16, true);
					const postingsLen = this.#view.getUint32(headerSize + mid * entrySize + 20, true);
					const result: number[] = [];
					for (let j = 0; j < postingsLen; j++) {
						result.push(this.#view.getUint32(postingsOffset + j * 4, true));
					}
					return result;
				}

				// 存在冲突，需要检查实际token是否匹配
				// 由于相同哈希值的token是连续存储的，需要向前和向后搜索所有匹配的哈希值
				// 先找到第一个匹配的哈希值
				let firstMatch = mid;
				while (firstMatch > 0) {
					const prevPos = headerSize + (firstMatch - 1) * entrySize;
					if (this.#view.getBigUint64(prevPos, true) === h) {
						firstMatch--;
					} else {
						break;
					}
				}

				// 搜索所有匹配的哈希值，检查token是否完全匹配
				for (let i = firstMatch; i < count; i++) {
					const checkPos = headerSize + i * entrySize;
					const checkHash = this.#view.getBigUint64(checkPos, true);
					if (checkHash !== h) break;

					// 读取token并比较
					const tokenLen = this.#view.getUint32(checkPos + 8, true);
					const tokenOffset = this.#view.getUint32(checkPos + 12, true);
					const tokenBuffer = new Uint8Array(this.#buffer, tokenOffset, tokenLen);
					const storedToken = decoder.decode(tokenBuffer);

					if (storedToken === term) {
						// 找到完全匹配的token，返回postings
						const postingsOffset = this.#view.getUint32(checkPos + 16, true);
						const postingsLen = this.#view.getUint32(checkPos + 20, true);
						const result: number[] = [];
						for (let j = 0; j < postingsLen; j++) {
							result.push(this.#view.getUint32(postingsOffset + j * 4, true));
						}
						return result;
					}
				}
				return [];
			}
		}
		return [];
	}
}
