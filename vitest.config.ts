import {defineConfig} from "vitest/config"

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			instances: [
				{
					browser: "1",
				} as any
			]
		},
		include: ['./test/*.test.ts'],
	},
})
