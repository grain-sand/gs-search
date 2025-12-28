// 测试工具函数

export function getTestBaseDir(prefix: string = '') {
	let workerId = '0';
	if (typeof process !== 'undefined' && process.env) {
		workerId = process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0';
	}
	return `config_test_data_${prefix}_${workerId}`;
}

// 清理测试目录的公共函数
export async function cleanupTestDirs(prefixes: string[]) {
	// 仅在 Node.js 环境中执行清理
	if (typeof process !== 'undefined' && process.versions && process.versions.node) {
		try {
			const fs = await import('node:fs');
			prefixes.forEach(prefix => {
				const dirsToClean = [
					getTestBaseDir(prefix),
					getTestBaseDir(prefix) + '_node',
					getTestBaseDir(prefix) + '_custom'
				];
				dirsToClean.forEach(d => {
					if (fs.existsSync(d)) {
						try {
							fs.rmSync(d, {recursive: true, force: true});
						} catch (e) {
							console.error(`Failed to cleanup test dir ${d}:`, e);
						}
					}
				});
			});
		} catch (e: any) {
			// Ignore errors in non-Node environments
		}
	}
}
