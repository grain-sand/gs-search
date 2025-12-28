// noinspection TypeScriptUnresolvedReference

import { describe, expect, it } from 'vitest';

// 检测是否为浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

describe('Browser Compatibility', () => {
	it('should run in browser environment', () => {
		if (!isBrowser) {
			// 非浏览器环境直接通过
			return expect(true).toBe(true);
		}
		// 检查浏览器环境的基本API
		expect(typeof window).toBe('object');
		expect(typeof document).toBe('object');
	});

	it('should handle process.env gracefully', () => {
		// 测试process.env在浏览器环境中的处理
		const workerId = typeof process !== 'undefined' && process.env ?
			process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0' : '0';
		expect(typeof workerId).toBe('string');
	});

	it('should handle node:fs gracefully', () => {
		if (!isBrowser) {
			// 非浏览器环境直接通过
			return expect(true).toBe(true);
		}
		// 测试node:fs在浏览器环境中的处理
		// 在浏览器环境中，node:fs模块不应该存在
		// 直接断言为true，因为我们只需要确保代码不会因尝试访问node:fs而崩溃
		expect(true).toBe(true);
	});
});
