import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ['./tests/**/*.test.ts'],
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
                'src/**/*.d.ts'
            ],
        },
    },
});
