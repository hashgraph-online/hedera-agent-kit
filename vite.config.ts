import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
  const isBrowserBuild = mode === 'browser';

  const baseConfig = {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
      },
      rollupOptions: {
        external: [
          '@hashgraph/sdk',
          '@hashgraphonline/hashinal-wc',
          '@hashgraphonline/standards-sdk',
          '@hashgraphonline/standards-agent-kit',
          '@langchain/core',
          '@langchain/langgraph',
          '@langchain/openai',
          'bignumber.js',
          'date-fns',
          'dotenv',
          'zod',
          'path',
          'fs',
        ],
      },
    },
    plugins: [
      dts({
        outDir: resolve(__dirname, 'dist/types'),
        insertTypesEntry: true,
        entryRoot: resolve(__dirname, 'src'),
      }),
    ],
  };

  if (isBrowserBuild) {
    return {
      ...baseConfig,
      build: {
        ...baseConfig.build,
        outDir: resolve(__dirname, 'dist/browser'),
        lib: {
          ...baseConfig.build.lib,
          name: 'HederaAgentKit',
          fileName: (format) => `hedera-agent-kit.${format}.js`,
          formats: ['es', 'umd'],
        },
        rollupOptions: {
          ...baseConfig.build.rollupOptions,
          output: {
            globals: {
              '@hashgraph/sdk': 'HederaSDK',
              '@hashgraphonline/standards-sdk': 'StandardsSDK',
              '@hashgraphonline/standards-agent-kit': 'StandardsAgentKit',
              '@hashgraphonline/hashinal-wc': 'HashinalsWalletConnectSDK',
              '@langchain/core': 'LangchainCore',
              '@langchain/langgraph': 'LangchainLanggraph',
              '@langchain/openai': 'LangchainOpenAI',
              'bignumber.js': 'BigNumber',
              'date-fns': 'DateFns',
              fs: 'Fs',
              path: 'Path',
              dotenv: 'Dotenv',
              zod: 'Zod',
            },
          },
        },
      },
    };
  }

  // Node.js build (CJS and ESM)
  return {
    ...baseConfig,
    build: {
      ...baseConfig.build,
      outDir: resolve(__dirname, 'dist/node'),
      lib: {
        ...baseConfig.build.lib,
        fileName: (format) => `index.${format === 'cjs' ? 'cjs' : 'mjs'}`,
        formats: ['es', 'cjs'],
      },
    },
  };
});
