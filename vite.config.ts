import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import StringReplace from 'vite-plugin-string-replace';
import type { LibraryFormats } from 'vite';

export default defineConfig(() => {
  const format = (process.env.BUILD_FORMAT || 'es') as LibraryFormats;
  let outputDir: string;

  if (format === 'umd') {
    outputDir = 'dist/browser';
  } else if (format === 'cjs') {
    outputDir = 'dist/node';
  } else {
    outputDir = 'dist/node';
  }

  const externalDependencies = [
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
  ];

  const plugins = [
    StringReplace([
      {
        search: 'VITE_BUILD_FORMAT',
        replace: format,
      },
    ]),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'examples/**/*', 'tests/**/*', 'vite.config.ts'],
      outDir: format === 'es' ? 'dist/types' : outputDir,
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ];

  return {
    plugins,
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        util: 'util',
      },
    },
    build: {
      outDir: outputDir,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: format === 'umd' ? 'HederaAgentKit' : undefined,
        fileName: (fmt) => {
          if (format === 'umd') {
            return `hedera-agent-kit.${fmt}.js`;
          } else if (format === 'cjs') {
            return 'index.cjs';
          } else {
            return 'index.mjs';
          }
        },
        formats: [format],
      },
      rollupOptions: {
        external: (id: string) => {
          if (format === 'umd') {
            return false;
          }
          return (
            externalDependencies.some(
              (dep) => id === dep || id.startsWith(`${dep}/`)
            ) ||
            (!id.startsWith('.') &&
              !id.startsWith('/') &&
              !id.includes(__dirname))
          );
        },
        output:
          format === 'cjs'
            ? {
                exports: 'named',
                format: 'cjs',
              }
            : {
                globals: (id: string) => {
                  const globalMap: Record<string, string> = {
                    '@hashgraph/sdk': 'HederaSDK',
                    '@hashgraphonline/hashinal-wc': 'HashinalsWalletConnectSDK',
                    '@hashgraphonline/standards-sdk': 'StandardsSDK',
                    '@hashgraphonline/standards-agent-kit': 'StandardsAgentKit',
                    '@langchain/core': 'LangchainCore',
                    '@langchain/langgraph': 'LangchainLanggraph',
                    '@langchain/openai': 'LangchainOpenAI',
                    'bignumber.js': 'BigNumber',
                    'date-fns': 'DateFns',
                    dotenv: 'Dotenv',
                    zod: 'Zod',
                  };
                  return globalMap[id] || id;
                },
                preserveModules: format === 'es',
                preserveModulesRoot: format === 'es' ? 'src' : undefined,
                exports: 'named',
                inlineDynamicImports: format === 'umd',
                name: format === 'umd' ? 'HederaAgentKit' : undefined,
              },
      },
      minify: 'terser',
      sourcemap: true,
      target: 'es2020',
    },
    define: {
      VITE_BUILD_FORMAT: JSON.stringify(format),
      ...(format === 'cjs' ? { Buffer: 'globalThis.Buffer' } : {}),
    },
    ssr: {
      noExternal: [],
      external: externalDependencies,
    },
  };
});
