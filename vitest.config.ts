import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ['./tests/integration/**/*.test.ts'],
        testTimeout: 60000,
        hookTimeout: 60000,
        setupFiles: ['./tests/integration/setup-env.ts'],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ['src/**/*.ts'],
            exclude: [
                'src/types/**/*.ts',
                'src/**/index.ts',
                'src/**/*.d.ts',
                'src/langchain/tools/common/base-hedera-query-tool.ts',
                'src/langchain/tools/common/base-hedera-transaction-tool.ts'
            ],
        },
    },
});
