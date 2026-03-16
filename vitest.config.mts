import { createBackendConfig } from '@sanamyvn/vitest-config/backend';
import swc from 'unplugin-swc';

const config = createBackendConfig({
  alias: {
    '@/': new URL('./src/', import.meta.url).pathname,
  },
});

config.plugins = [swc.vite({ tsconfigFile: './tsconfig.json' })];
// Disable Oxc transformer — SWC handles all transforms via unplugin-swc
config.oxc = false;

const projects = config.test?.projects;
if (projects) {
  for (const project of projects) {
    if (typeof project === 'object' && project !== null && 'test' in project) {
      if (project.test?.name === 'integration') {
        project.test.globalSetup = ['./tests/global-setup.ts'];
      }
    }
  }
}

export default config;
