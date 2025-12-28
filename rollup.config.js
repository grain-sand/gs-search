import dts from 'rollup-plugin-dts'
import alias from '@rollup/plugin-alias'
import esbuild from 'rollup-plugin-esbuild'
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy'

const input = 'src/index.ts'

export default [
	{
		input,
		output: [
			{
				file: 'dist/lib/index.d.ts',
				format: 'esm',
				sourcemap: false,
			},
		],
		plugins: [dts({respectExternal: false})],
	},
	{
		input,
		output: [
			{
				file: 'dist/lib/index.js',
				format: 'esm',
				sourcemap: false,
			},
			{
				file: 'dist/lib/index.cjs',
				format: 'cjs',
				sourcemap: false,
			},
		],
		plugins: [
			alias(),
			resolve(),
			typescript(),
			esbuild({
				target: 'es2022',
				minifySyntax: true,
			}),
			terser(),
			copy({
				targets: [
					{src: '*.md', dest: 'dist'},
				]
			})
		]
	}
];
