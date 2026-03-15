import { createBackendConfig } from '@sanamyvn/vitest-config/backend';
import swc from 'unplugin-swc';

const config = createBackendConfig({
  alias: {
    '@/': new URL('./src/', import.meta.url).pathname,
  },
});

config.plugins = [swc.vite({ tsconfigFile: './tsconfig.json' })];

export default config;
