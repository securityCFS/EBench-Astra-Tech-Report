# EBench Astra report website — editing handoff

## Run and edit

This is a dependency-free static site. `dist/` contains the authored website source (it is not disposable build output). Run `npm run dev`, then open `http://127.0.0.1:4173/`. Use `npm run check` and `npm run validate` before shipping changes. Git LFS is required for MP4 and PDF assets: run `git lfs install` and `git lfs pull` after cloning.

- `dist/index.html`: report masthead, authors, links, section sequence.
- `dist/showcase.css`: current light report design and responsive overrides.
- `dist/style.css`: shared original chart, table, dialog and video primitives.
- `dist/app.js`: report narrative, main findings, case tabs, videos, supplementary dialogs.
- `dist/narrative.js`: source-grounded analytical synthesis; see `docs/REPORT-COPY.md` for the editorial brief and source map.
- `dist/charts.js`: overall SVG bars (with the optional Wilson-interval toggle), dot-strip capability profiles, sortable task heatmap.
- `dist/viz.js`: shared figure toolkit — tooltip, linked model highlighting, dot strips, per-task outcome rows, Astra-versus-field bars, perturbation slopes, paired-ICL dumbbells, execution-timing bars, reading widgets.
- `dist/refresh.css`: design-refresh layer loaded after `showcase.css`; tokens, figure styles, key-figure strips, widgets and the phone placement of the Contents toggle.
- `dist/showcase.js`: featured demo switching, case focus, stage controls, decorative canvas.
- `dist/research.js`: main-page comparison matrices, POC, behavioral evidence, episode dots, video library.
- `dist/data/`: chart/table data and selected-episode metadata. Raw field ID `FastWAM` remains stable; visible name is **Fast-WAM**.

## Current agreed presentation

The masthead pairs the official **InternRobotics** and **Shanghai AI Laboratory** logos. Use the original local assets in `dist/media/brand/`, preserving their proportions; see `docs/brand-assets.json` for provenance. The old “InterRobotics” spelling was incorrect. All user-facing model mentions use **GPT-6-Astra**, including charts, tables, controls and video captions. Canonical data key `Astra (ICL)` and existing asset filenames remain unchanged; normalize display labels rather than renaming source fields.

The latest author direction prioritizes three research questions: Astra versus VLA/WAM capability differences, failure patterns and research implications, and exploration/correction/within-episode experience use. Present dataset results before analysis. Do not compress the report into slogans or restore it verbatim; preserve explanatory substance and connect claims to evidence. The 26-task rollout library is one collapsed case card, not a standalone benchmark-promotion section. Chart colors are blue/indigo/cool gray; mustard, olive and salmon were explicitly rejected.

Light main reading areas, dark navigation/footer accents, restrained stars only in the masthead. Avoid turning each finding or chart into a card. The opening motivation precedes Benchmark Results, which introduces the experiment before showing metrics. The author removed the redundant 46.73% / 2 of 8 / 26 tasks / 510 episodes masthead summary strip; do not reintroduce it. The masthead includes all authors and affiliations from the preserved report layout, a working Evaluation Entrance and disabled arXiv Coming soon button. The arXiv URL does not exist yet. The author asked to withdraw the unfinished current PDF from the page: do not add PDF download buttons, page citations linking to it, or PDF links in supplementary dialogs. Keep the source draft for internal reference.

The main benchmark table has three views: overall/task attributes, all 26 tasks, and distribution shifts. It includes all eight current systems, with shared absolute color scales, rounded heat cells, SR/Score switching and task sorting/filtering. Screenshot references supplied by the author are visual references only; their old model cohorts and numbers must not replace current data.

## Evidence and scientific boundaries

- The latest user-supplied `Ebench_Agent_report.pdf` is copied unchanged to `dist/report.pdf`. Its publication title and conclusion remain work in progress. The website title remains the Astra evaluation title.
- Main cohort: **26 tasks, 510 episodes, one-demo ICL throughout**. Task-macro SR **46.73%**, Score **0.6537**. Astra ranks second of eight.
- Episode counts: **237 successful / 188 incomplete with positive Score / 85 incomplete with zero Score**. Episode-weighted SR is 46.47%, distinct from task-macro SR.
- `report-figures.json` provides report-level rounded aggregates. `tasks.json` provides the retained task values. `episodes.json` contains only task, seed, SR, Score for the 510 retained episodes. `report-SOURCE_MAP.json` records supplied source hashes.
- The main library covers all 26 tasks via 27 supplied demos (one extra peg example); selected video frequency is not a success estimate.
- Coffee-beans episode 013 and fruit episode 015 are extracted from the full video archive and transcoded to browser-compatible H.264. Captions follow the PDF, not inferred hidden reasoning. Public action descriptions are quotes from the supplied report.
- Apple-to-fruit-bowl episode 006 adds a successful exploration/recovery example. Three public action notes link detection of a slip, obtaining a wider view, and changing the next transport strategy. The exact recording and terminal result are matched; see `docs/REPORT-COPY.md`. This is within-episode experience use, not demonstrated cross-episode learning.
- Case-study teacup, glasses, frame and gear videos are selected qualitative comparisons. Do not infer recovery frequency or benchmark success from visual local score labels.
- Frame/gear paired ICL studies each have four fresh paired seeds. Dishwasher has five historical comparisons with channel/date differences. These are separate from both the main cohort and the selected qualitative case videos.

## POC — user clarification

POC is an **independent validation experiment outside EBench's original 26 tasks**, not an ICL experiment. Compared VLA/WAM policies are retrained and evaluated on this experiment's constituent atomic skills. Objects and skills are familiar to those policies, but the composed evaluation tasks are unseen. Test-time execution is **zero-shot, without demonstrations**, including Astra. This probes composition/generalization and task understanding.

Four provided videos are included: Astra, π₀.₅, OpenWAM recording 1, OpenWAM recording 2. The author has not confirmed the two OpenWAM checkpoint identities or aggregate scores. Preserve supplied numbering, do not infer checkpoint names, and do not add quantitative POC claims. The experiment's full narrative is still being written.

## Pending author edits

The author explicitly said the previous Implications claims were not all correct and will provide revisions, then requested analysis of what the three research questions imply. The current discussion therefore poses concrete, evidence-grounded research directions rather than claiming evaluated improvements; do not treat final implications as approved. POC checkpoint labels and final analysis, arXiv URL, and publication copy remain author-owned open items.

## Assets and backups

All assets referenced by the running site are local and included in Git/LFS. Original multi-GB archives and machine-specific backup directories are not committed. Local backups preserve the earlier paper/report layout, the card version, and the continuous dark version. The current source can be edited remotely without those archives.

No external API credentials or account access are required. `.openai/` contains machine-specific site registration and is excluded from the remote handoff. Synchronizing this repository does not deploy the website.

Benchmark overview and Evaluation metrics links go to https://internrobotics.github.io/EBench-doc/getting-started/overview/; task exploration goes to https://internrobotics.github.io/EBench-doc/evaluation/task-showcase/. Report-specific comparison tables and ablations remain within this report. Keep the overall rate and secondary Score in one aligned typographic group, with the metric description above.

Use **single-shot ICL** consistently in edited page copy (the introductory expansion remains “Single-shot In-Context Learning (ICL)”). KaTeX 0.16.22 is copied from Gauge into `dist/vendor/katex/` with fonts and MIT license. `dist/model-math.js` renders the model names as `\pi_{0}` and `\pi_{0.5}`, including newly inserted tables, case controls, captions and SVG chart labels. Canonical Pi0/Pi05 data keys remain unchanged.

Reading hierarchy: retain selective semantic bold on decisive comparisons, failure patterns and action revisions; avoid uniformly emphasizing whole paragraphs. Both heatmaps use one shared absolute blue scale and choose black/white text from relative luminance, with a measured minimum contrast of 4.59:1 across 10,001 sampled values. Do not restore the previous fixed score threshold for text color.


## Complete historical ICL packages (2026-09-18)

- Setup now contains a compact visual card opening the actual reference input viewer. ICL case studies also link to their task package.
- `dist/icl-viewer.js` loads `dist/data/icl-packages.json`: all 26 main-cohort seed-000 packages, 417 original text blocks and 365 original PNGs. Every input is retained in order, including numeric excerpts and historical/current boundary markers. Only image paths are relocated. Complete input tab and per-task JSON download preserve source precision; the overview table rounds numbers for readability.
- Images are in `dist/media/icl/`; `docs/icl-assets.json` records the source archive, original data entries and hashes. `npm run validate` verifies every image hash and coverage. These assets total about 91 MB and load on demand.
- User explicitly distinguishes actual supplied ICL data (show completely) from casually written authoring prompts (do not publish). Do not expose original-user-prompts, annotation-batch templates, or initial execution prompts as report appendices.
- Source `episode` identifies the receiving evaluation run; historical source episodes are specified in the original annotations. Historical top-camera views are not live-policy observations. Demonstrations have no official source success labels.
- Paired ICL appendix now separates the eight fresh pairs from the five historical dishwasher comparisons; displays both SR and Score, regressions, and terminal holding caveats from appendix.tex. No main-cohort aggregate is changed.


## Author copy revision 1

The masthead title is “How Frontier Language Models Reshape Embodied Policies”, with subtitle “A Comprehensive Evaluation of GPT-6-Astra on EBench”. Introduction now precedes Overall performance, using the author's four paragraphs verbatim (including requested emphasis). This supersedes the previous results-first opening; quantitative results still precede General Analysis. The opening epigraph is “Welcome to the real world.” — The Matrix (1999), with a linked attribution. The launch date and qualitative framing in this opening are author-supplied copy, not newly verified benchmark findings.


## Author copy revision 2

Remove the visible Introduction label. Preserve the opening prose as two paragraphs (model context + frontier question; EBench rationale), linking the first prose mention of EBench to https://github.com/InternRobotics/EBench. Rename the results chapter Benchmark Results. Its opening now gives the 26-task / 510-episode evaluation scope and open-source leaderboard comparison before the enlarged SR and Score. Then report second place behind OpenWAM-α and introduce capability differences. Footnote 1 explains the author's exclusion of Amapbot Group due to missing reliable model description and references. The note defines report scope without changing benchmark data.


## Reading order after setup revision

Opening motivation → benchmark scope and headline SR/Score → Experiment Setup (including complete ICL package card) → Complete benchmark comparison → General Analysis and cases. The matrix and its supplementary-result links now live in #comparison, after #setup. #overall retains the headline chart and comparison-scope footnote. Do not move the full comparison ahead of the experiment explanation.


## Frame-aligned ICL text and Matrix epigraph

The ICL frame viewer pairs each original image with its immediately preceding text input, displayed verbatim in a dedicated Frame Prompt panel with one-based source block numbers. The shared task annotation remains available under “Shared task prompt”; it is distinct from frame-specific text and no authoring prompts are added. Thumbnails, next/previous and range selection all update the same pair.

`dist/quote-effect.js` supplies a canvas digital-rain background confined to the Matrix quotation. Text stays centered in Allura with a right-aligned attribution. The animation has its own pause button, respects reduced-motion preference, and stops when offscreen or the document is hidden. The report body remains light.


## Navigation and ICL album revision (2026-09-19)

Shanghai AI Lab logo now precedes InternRobotics. The header stays sticky, including a second navigation row on phones. `report-navigation.js` provides the fixed left Contents toggle, current-section tracking, Escape collapse, and per-session preference. At >=1400 px an expanded outline reserves 230 px beside the body; on smaller screens it overlays and closes after selecting a link.

The Matrix quote now uses a lighter blue background with green characters. The on-card pause button is removed at the author's request; reduced-motion, offscreen and visibility handling remain. ICL frames and original text have equal-width/equal-height panels on desktop, readable labels, and previous/next controls outside the pair, plus keyboard arrows. Phones stack the panels. Data and source wording remain unchanged.


## Author clarification: ICL preparation and POC trajectories

A separate GPT-6-Astra instance at `high` reasoning effort reviews one training-set video trajectory per task and autonomously chooses the annotated keyframes and accompanying prompts. This provenance is now stated both in Experiment Setup and the ICL viewer; do not confuse it with the evaluation agent or publish authoring prompts. Format `high` as inline code. Composed POC tasks have no ground-truth trajectories, which is why their evaluation uses zero-shot rather than ICL. Atomic-skill training of comparison policies remains distinct from those unseen compositions. These details were explicitly supplied by the author on 2026-09-19.


## Complete task-attribute filters

The task heatmap and video library share a Task attribute selector with optgroups: Mobility (Mobile/Tabletop), Precision (Low/Medium/High), Task horizon (Short/Long). All seven options show counts computed from tasks.json. `matchesTaskGroup` uses the explicit field and value, so categories from different dimensions cannot be confused. The counts describe the complete task cohort; search and video-outcome filters may reduce the displayed results further.

## Conclusion and safety revision (2026-09-19)

The author supplied a new conclusion, titled “Conclusion and Insights: where shall we head to?”. Preserve its four directions: couple agents with on-device policies; transfer planning/exploration/recovery through intention imitation; turn experience into reusable tools and RSI; make safety part of execution. The RPent architectural reference links to official documentation. RSI, training-data efficiency, and hybrid benefits remain proposed directions rather than measured improvements.

A Safety in execution subsection now follows emerging capabilities and precedes Case Studies, with a Contents link. Three keyboard-accessible tabs reuse coffee013, the qualitative Astra glasses recording, and apple006. Each separates recorded behavior from a prospective physical risk and a control question. Do not label glasses with a main-cohort seed or a score, and do not treat requested contact adjustments as verified contact. See REPORT-COPY.md for evidence provenance. Browser automation was unavailable during this revision; perform visual QA when its connection recovers.

## Timing/physical-constraint correction (2026-09-19)

Remove blanket statements that latency or safety cannot be assessed because they are not in the current manuscript. The author confirmed 30 Hz simulation and requested trajectory-based comparison with URDF and hardware limits. The conclusion no longer carries the unsolicited disclaimer. The limitations entry now opens Evaluation protocol and execution measurements, with a three-case timing table, separate clocks for simulator duration and policy wall duration, and joint-limit analysis methodology.

Reproduction: python scripts/analyze-execution-timing.py astra_web_evidence_20260918_core.zip. Output: dist/data/execution-timing.json. Values and definitions are documented in REPORT-COPY.md. No pure-inference latency or hardware-limit exceedance is inferred from policy wall time or sparse joint samples. The exact URDF/hardware comparison has not yet been incorporated into this calculation; do not substitute an unrelated robot configuration.


## Design refresh (2026-09-18)

Branch `design/interactive-refresh`. The refresh keeps every author decision above: light reading surfaces, dark header/footer, blue/indigo/cool-gray series, no masthead summary strip, no PDF links, single-shot ICL wording, the collapsed 26-task library, and the reading order. It adds figures and interaction without changing any reported number:

- Key figures above the mobile/precision/horizon prose are generated from `report-figures.json` (previously the hard-coded metric blocks in `app.js` were overwritten by `narrative.js` and never displayed). Prose still comes from `narrative.js`.
- Task-attribute charts are dot-strip profiles showing all eight systems; legend chips emphasize a system instead of hiding it. Hovering a system dims the others in every linked figure.
- Comparison matrix view **GPT-6-Astra vs. field** and the per-task outcome rows are derived from `tasks.json` and `episodes.json`; selecting a task opens its selected episode through the existing `data-task-video` handler.
- Slope, dumbbell and timing figures are inserted next to the tables they summarize (`decorateAppendix` / `drawFigures` in `app.js`; `initTimingCharts` in `research.js`).
- The **95% interval** toggle on the overall chart is off by default and labelled as an episode-level Wilson interval that ignores task clustering; it is a presentation aid, not a new reported statistic.
- The leaderboard rows are generated from `report-figures.json`; the duplicated `models` array in `app.js` was removed.
- Browser QA in this revision: headless Chromium at 1440 and 390 px, zero console errors, every dialog and tab exercised. Videos were not yet pulled from LFS during the screenshots; layout was checked with placeholder frames.
