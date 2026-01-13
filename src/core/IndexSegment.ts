import {ITokenizedDoc, IStorage} from '../type';
import {murmur3_32} from "./murmur3_32";

export class IndexSegment {
	#filename: string;
	#storage: IStorage;
	#buffer: ArrayBuffer | null = null;
	#view: DataView | null = null;

	constructor(filename: string, storage: IStorage) {
		this.#filename = filename;
		this.#storage = storage;
	}

	/**
	 * 使用MurmurHash3计算字符串哈希值
	 * @param str 要哈希的字符串
	 * @returns 32位无符号哈希值
	 */
	static hash(str: string): number {
		return murmur3_32(str);
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
		const tokenMap = new Map<string, { hash: number; postings: number[] }>();

		// 去重并构建 postings
		for (const doc of docs) {
			const uniqueTokens = new Map<string, boolean>();
			for (const token of doc.tokens) {
				if (!uniqueTokens.has(token)) {
					uniqueTokens.set(token, true);
					if (!tokenMap.has(token)) {
						tokenMap.set(token, {
							hash: IndexSegment.hash(token),
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
			if (ah.hash !== bh.hash) return ah.hash - bh.hash;
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
		  Header: 12
		  Dict: entries.length * 20
		  Postings: totalPostings * 4
		  Tokens: totalTokensSize
		*/
		const headerSize = 12;
		const dictSize = entries.length * 20;
		const postingsSize = totalPostings * 4;
		const tokensOffset = headerSize + dictSize + postingsSize;
		const totalSize = tokensOffset + totalTokensSize;

		const buffer = new ArrayBuffer(totalSize);
		const view = new DataView(buffer);

		// Header
		view.setUint32(0, 0x494E4458);          // 'INDX'
		view.setUint32(4, entries.length, true);
		view.setUint32(8, tokensOffset, true);

		let currentDictOffset = headerSize;
		let currentPostingsOffset = headerSize + dictSize;
		let currentTokenOffset = tokensOffset;

		for (const [token, {hash, postings}] of entries) {
			// Dict entry
			view.setUint32(currentDictOffset, hash, true);
			const tokenBytes = encoder.encode(token);
			view.setUint32(currentDictOffset + 4, tokenBytes.length, true); // UTF-8字节长度
			view.setUint32(currentDictOffset + 8, currentTokenOffset, true);
			view.setUint32(currentDictOffset + 12, currentPostingsOffset, true);
			view.setUint32(currentDictOffset + 16, postings.length, true);
			currentDictOffset += 20;

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
		const h = IndexSegment.hash(term);
		const count = this.#view.getUint32(4, true);

		let left = 0;
		let right = count - 1;
		const headerSize = 12;
		const entrySize = 20;
		const decoder = new TextDecoder();

		// 二分查找哈希值
		while (left <= right) {
			const mid = (left + right) >>> 1;
			const entryPos = headerSize + mid * entrySize;
			const entryHash = this.#view.getUint32(entryPos, true);

			if (entryHash < h) {
				left = mid + 1;
			} else if (entryHash > h) {
				right = mid - 1;
			} else {
				// 检查是否存在哈希冲突
				const hasConflict = (mid > 0 && this.#view.getUint32(headerSize + (mid - 1) * entrySize, true) === h) ||
					(mid < count - 1 && this.#view.getUint32(headerSize + (mid + 1) * entrySize, true) === h);

				if (!hasConflict) {
					// 无冲突，直接返回当前条目的postings
					const postingsOffset = this.#view.getUint32(headerSize + mid * entrySize + 12, true);
					const postingsLen = this.#view.getUint32(headerSize + mid * entrySize + 16, true);
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
					if (this.#view.getUint32(prevPos, true) === h) {
						firstMatch--;
					} else {
						break;
					}
				}

				// 搜索所有匹配的哈希值，检查token是否完全匹配
				for (let i = firstMatch; i < count; i++) {
					const checkPos = headerSize + i * entrySize;
					const checkHash = this.#view.getUint32(checkPos, true);
					if (checkHash !== h) break;

					// 读取token并比较
					const tokenLen = this.#view.getUint32(checkPos + 4, true);
					const tokenOffset = this.#view.getUint32(checkPos + 8, true);
					const tokenBuffer = new Uint8Array(this.#buffer, tokenOffset, tokenLen);
					const storedToken = decoder.decode(tokenBuffer);

					if (storedToken === term) {
						// 找到完全匹配的token，返回postings
						const postingsOffset = this.#view.getUint32(checkPos + 12, true);
						const postingsLen = this.#view.getUint32(checkPos + 16, true);
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
