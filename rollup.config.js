import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy'

const regexReplace = (patterns) => ({
	name: 'regex-replace',
	generateBundle(_, bundle) {
		for (const file of Object.keys(bundle)) {
			const chunk = bundle[file];
			if (chunk.type === 'asset' || chunk.type === 'chunk') {
				let code = chunk.code || chunk.source;
				for (const {find, replacement} of patterns) {
					code = code.replace(find, replacement);
				}
				if (chunk.code) {
					chunk.code = code;
				} else {
					chunk.source = code;
				}
			}
		}
	},
});

const external = (id) => {
	return id.includes('/browser') || id.includes('/core') || id.includes('/type')|| id.includes('/node');
};

const tsConfig = {
	respectExternal: false,
	exclude: ["test/**/*.ts"],
}

// const aliasIns = alias({entries: {find: '../core', replacement: './core'}});
const replace = regexReplace([
	{find: /(['"])(?:[.]+\/)+(browser|node|type|core)\1/g, replacement: `'./$2'`},
	{find: /export\s*\{\s*_\s*};\n|exports._="";|const\s*o="";export{o\s*as _};\n|declare\s*const\s*_\s*=\s*"";/g, replacement: ''},
]);

const defaultPlugins = [
	resolve(),
	typescript(tsConfig),
	esbuild({
		target: 'es2022', // 设置为 ES2022 以确保使用 const/let
		minifySyntax: true, // 压缩时保留现代语法
	}),
	terser(),
	replace
];

function createConfig(output, plugins=defaultPlugins, input) {
	input || (input = `src/${output}/index.ts`)
	const ts = {
		input,
		external,
		output: [
			{
				file: `dist/lib/${output}.d.ts`,
				format: 'esm',
				sourcemap: false,
			},
		],
		plugins: [dts(tsConfig), replace],
	};
	return [
		ts
		,
		{
			input,
			external,
			output: [
				{
					file: `dist/lib/${output}.js`,
					format: 'esm',
					sourcemap: false,
				},
				{
					file: `dist/lib/${output}.cjs`,
					format: 'cjs',
					sourcemap: false,
				},
			],
			plugins
		}
	]
}

const mainConfigJsPlugins = [...defaultPlugins];

if (process.env.COPY) {
	mainConfigJsPlugins.push(copy({
		targets: [
			{src: '*.md', dest: 'dist'},
		]
	}))
}

export default [
	...createConfig('type'),
	...createConfig('node'),
	...createConfig('core'),
	...createConfig('browser'),
	...createConfig('index',mainConfigJsPlugins,'src/index.ts'),
];
