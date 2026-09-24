# EBench × GPT-6-Astra

Interactive technical report built with Astro. The `clean` branch contains the redesigned report.

## Development

Requires Node.js 22.12+ and Git LFS. MP4 files are LFS assets: without downloading them, Git leaves tiny pointer files rather than playable recordings.

```sh
git lfs install --local
git lfs pull --include="dist/media/**" --exclude=""
npm ci
npm run dev
```

Open the URL printed by Astro (normally http://127.0.0.1:4322/).

## Source map

- `src/layouts/ReportLayout.astro`: document, fonts, shared shell and resources.
- `src/pages/index.astro`: report section order.
- `src/components/`: section content, static results, execution demo, recording library and shared supplementary dialog. Static component styles are scoped.
- `src/scripts/`: interactive evidence viewers and data-driven tables.
- `src/lib/`: shared SVG icons and overall ranking data adapter.
- `src/styles/`: tokens, shared table/control styles, namespaced interactive components and remaining legacy widget styles.
- `integrations/report-runtime.mjs`: Vite compatibility boundary for the interdependent evidence scripts; watches source changes without generating runtime files.
- `dist/data`, `dist/media`, `dist/vendor`: **versioned research assets**, not build output. This legacy asset path is retained in this pass.
- `.generated/public`: prepared assets, ignored by Git.
- `_site-next`: Astro's generated deployment output, ignored by Git.

The two shared table treatments are `report-table--plain` and `report-table--heat`. Segmented controls share one indicator helper; underline tabs and sliding pills respect reduced-motion preferences. Supplementary material uses one dialog shell.

## Formatting and checks

```sh
npm run format
npm run format:check
npm run check
npm run validate
npm run build
npx playwright install chromium
npm run test:layout -- --project=chromium
```

`validate` verifies benchmark aggregates, retained episodes, ICL assets and startup behavior. Playwright covers responsive layouts, controls, media interaction and data preservation. Firefox/WebKit configurations are also available when their browser binaries are installed.

## GitHub Pages

The existing **Deploy report to GitHub Pages** workflow is Astro-compatible:

1. Check out the selected branch and download LFS videos.
2. Install Node dependencies and validate the report.
3. Build with `REPORT_BASE=/EBench-Astra-Tech-Report` (CI takes it from `actions/configure-pages`).
4. Upload `_site-next` and deploy it using GitHub Pages Actions.

Use `clean` as the working branch. In Actions, run **Deploy report to GitHub Pages** and select `clean` to publish it. The `github-pages` environment permits deployment only from `clean`, and the workflow enforces the same branch. Deployment remains **manual**; pushing `clean` does not automatically replace the live report. No local build output needs to be committed.
