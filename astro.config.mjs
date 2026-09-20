import { defineConfig } from 'astro/config';
import { reportRuntime } from './integrations/report-runtime.mjs';

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  publicDir: './.generated/public',
  outDir: './_site-next',
  site: 'https://securitycfs.github.io',
  base: process.env.REPORT_BASE || '/',
  server: { host: '127.0.0.1', port: 4322 },
  vite: { plugins: [reportRuntime()], build: { assetsInlineLimit: 0 } },
});
