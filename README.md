# Evaluating GPT-6-Astra on EBench

A dependency-free report and interactive evidence website. The authored source lives directly in `dist/`.

## Run

```sh
git lfs install
git lfs pull
npm run dev
```

Open http://127.0.0.1:4173/. No package installation or build step is required. Node.js and Git LFS are the only runtime/setup requirements. MP4 and PDF files are stored in Git LFS; a clone without LFS objects will not play the videos.

```sh
npm run check
npm run validate
```

## Current website

- Light reading surfaces, dark navigation/footer accents, a small animated star field limited to the masthead, and restored author/affiliation information.
- Evaluation Entrance links to the official evaluation landing page. The arXiv button is explicitly Coming soon; the current PDF is available separately.
- Overall performance appears first. Rounded SVG bars, all-eight-system benchmark matrices, a sortable 26-task heatmap, SR/Score controls, and distribution-shift tables are interactive.
- Mobile manipulation, exploration/feedback, recovery, ICL, precision and long-horizon evidence are connected to videos.
- POC has its own zero-shot compositional experiment tab with four recordings. It is outside the 26-task EBench benchmark and uses independently retrained comparison policies.
- A filterable video library covers every benchmark task. The 510-episode dot plot distinguishes 237 successes, 188 incomplete positive-score episodes and 85 zero-score episodes.

## Interactive figures (design refresh)

`dist/viz.js` and `dist/refresh.css` add linked, tooltip-driven figures on top of the existing tables; every figure reads the same JSON as the tables and changes no reported value.

- Overall bars gain a track and an optional **95% interval** toggle (Wilson interval on 510 episodes; ignores task clustering).
- Task-attribute charts are dot-strip profiles: all eight systems on one line per group, emphasized systems drawn larger, the best system ringed. Chips emphasize rather than hide.
- The comparison matrix has a fourth view, **GPT-6-Astra vs. field**: signed per-task difference to the best (or median) other system; a bar opens that task's episode.
- Episode outcomes are one row per task, one square per episode, sortable and filterable by attribute or outcome class.
- Perturbation results are drawn as a slope chart in the capability section and in the generalization dialog.
- Paired ICL results are dumbbells (zero-shot → single-shot ICL, per seed) in the ablation dialog and under the ICL case study.
- Execution timing appears as a log-axis bar chart in the Safety section and the protocol dialog.
- Key figures above each analytical section are computed from `report-figures.json`; the reading-progress bar, back-to-top button, section anchors and scroll reveal respect `prefers-reduced-motion`. On phones the Contents toggle sits at the bottom edge so it no longer covers headings.

## Editing handoff

See [docs/HANDOFF.md](docs/HANDOFF.md) for file responsibilities, scientific distinctions, data provenance, POC conditions, and pending author revisions. In particular, final Implications wording and POC checkpoint labels are not approved research conclusions.

- `dist/index.html`: report structure and masthead.
- `dist/showcase.css`: current layout/theme; `dist/style.css`: base components.
- `dist/app.js`: narrative, cases, video interactions and supplements.
- `dist/charts.js`: SVG charts and task heatmap.
- `dist/showcase.js`: featured videos, case focus and decorative motion.
- `dist/research.js`: benchmark matrices, POC, behavioral cases, outcome plot and library.
- `dist/data/`: report aggregates, task means, episode outcomes and demo metadata.
- `dist/media/`: locally served videos.
- `dist/report.pdf`: unchanged latest supplied PDF.
- `docs/asset-manifest.json`: SHA-256 inventory of published media and PDF.

Astra's headline SR 46.73% is task-macro, whereas 237/510 is episode-weighted SR 46.47%. All main-cohort runs use one-demo ICL. Selected qualitative cases and the independent zero-shot POC must not be folded into that cohort. Visible model naming uses **Fast-WAM**; raw data IDs remain unchanged.

## Verification and preserved versions

Data validation checks all 510 episode identities, task SRs, selected-demo terminal labels, 26-task coverage, and POC/behavior assets. Browser QA checks mobile/desktop layout, heatmap filters and metric selection, video dialogs, POC focus/playback, outcome highlighting, and the added H.264 behavior recordings.

Local, uncommitted backups preserve the original report (`backups/report-layout-20260918-191701/`), card layout (`backups/star-cards-source-20260918-194332/`), and full-dark layout (`backups/continuous-dark-source-20260918-195639/`). Original multi-GB archives, local analysis and site-registration files stay outside Git. This repository sync does not deploy the site.
