const $ = (s) => document.querySelector(s);
const title = (s) => s.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
const pct = (n) => (Number(n) * 100).toFixed(2).replace(/\.00$/, '');
let tasks = [],
  demos = [],
  ablations = {},
  reportFigures = {};
function video(path, label, detail, badge = 'Selected rollout') {
  return `<figure class="evidence-video"><div class="video-label"><strong>${label}</strong>${badge ? `<span>${badge}</span>` : ''}</div><div class="media-viewport"><video playsinline preload="none" data-src="${path}" aria-label="${label}"></video><button class="video-start" aria-label="Play ${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14l11-7z" fill="currentColor"/></svg></button></div>${detail ? `<figcaption>${detail}</figcaption>` : ''}</figure>`;
}
function mainVideo(task, seed, label, detail) {
  let d = demos.find((x) => x.task === task && x.seed === seed);
  return video(
    d.path,
    label,
    detail,
    `${d.sr ? 'Success' : 'Incomplete'} (Score ${d.score.toFixed(2)})`,
  );
}
function bars(groups) {
  return reportChart(
    groups[0].startsWith('Mobile')
      ? 'mobility'
      : groups[0].startsWith('Low')
        ? 'precision'
        : 'horizon',
  );
}
const section = (id, n, heading, sub, body) =>
  `<article class="finding" id="${id}"><div class="finding-inner"><div class="finding-heading"><span>${n}</span><div><h3>${heading}</h3></div></div>${body}</div></article>`;
const watch = (text) => '';
function renderAnalysis() {
  $('#mobile-content').innerHTML =
    `<div class="finding-grid"><div class="finding-story"><div class="finding-metric"><strong>56.58<span>%</span></strong><p>SR on 19 mobile tasks</p></div><p>Only 3.60 percentage points behind OpenWAM-α, compared with a wider gap on tabletop tasks. Mobile manipulation is a relative strength compared with tabletop tasks.</p><div class="task-highlights"><button data-appendix="results"><strong>100<small>%</small></strong><span>Remote to holder · 20/20</span></button><button data-appendix="results"><strong>90<small>%</small></strong><span>Bookmark placement · 18/20</span></button></div><p class="fineprint">Bookmark SR is 35 pp above the next-best model. These are end-to-end task results, not isolated recognition measurements.</p></div></div><div class="evidence-pair">${mainVideo('remote_to_holder', '000', 'Remote to holder', 'GPT-6-Astra 100% task SR; OpenWAM-α 65%.')}${mainVideo('bookmark_on_book', '000', 'Bookmark placement', 'GPT-6-Astra 90% task SR; next-best π₀.₅ 55%.')}</div>`;
  renderLimits('precision');
  initVideos();
  initCharts();
}
function renderLimits(kind) {
  const precision = kind === 'precision';
  $('#limits-content').innerHTML =
    `<div class="finding-grid"><div class="finding-story"><div class="finding-metric"><strong>${precision ? '11.25' : '28.10'}<span>%</span></strong><p>${precision ? 'SR on high-precision tasks' : 'SR on long-horizon tasks'}</p></div><p>${precision ? 'GPT-6-Astra’s SR falls from 60.60% on low-precision tasks to 11.25% on high-precision tasks. On peg insertion, 0.6000 mean Score accompanies only 20% success.' : 'GPT-6-Astra reaches 53.60% SR on short tasks but 28.10% on long tasks. OpenWAM-α retains 51.43% on the long-horizon group.'}</p><p>${precision ? 'Transport and approach can succeed while final alignment remains unresolved. The two peg episodes show the difference between substantial progress and a completed insertion.' : 'Local retries can repair one step while later stages remain unfinished. The selected dishwasher rollout is GPT-6-Astra’s only success among 20 episodes.'}</p><button class="appendix-link" data-appendix="${precision ? 'attributes' : 'horizon'}">Explore the group results ${reportIcon('external-link')}</button></div>${reportChart(precision ? 'precision' : 'horizon')}</div><div class="evidence-pair">${precision ? mainVideo('peg_in_hole', '000', 'Peg insertion', 'The peg remains exposed.') + mainVideo('peg_in_hole', '002', 'Peg insertion', 'One of four successes in 20 task instances.') : mainVideo('bottle', '003', 'Bottle placement', 'Some bottles remain outside the tray.') + mainVideo('dishwasher', '011', 'Dishwasher', 'Only one success in 20 GPT-6-Astra episodes.')}</div>`;
  updateLimitNarrative(kind);
  initVideos();
  initCharts();
  enhanceEvidence($('#limits-content'));
}
const cases = [
  {
    id: 'icl',
    n: '01 / IN-CONTEXT LEARNING',
    title: 'In-context learning',
    sub: 'Zero-shot vs. demonstration · Frame · Gear',
  },
  {
    id: 'adapt',
    n: '02 / ADAPTATION AND PRECISION',
    title: 'Adaptation and precision',
    sub: 'GPT-6-Astra · π₀.₅ · OpenWAM · Teacup · Glasses',
  },
  {
    id: 'poc',
    n: '03 / COMPOSITIONAL COMPLETION',
    title: 'Compositional completion',
    sub: 'Zero-shot · bookmark and pen',
  },
];
let activeCase = 'icl',
  iclTask = 'frame',
  adaptTask = 'teacup';
function openSelectedCase(id) {
  if (id === 'fine') {
    activeCase = 'adapt';
    adaptTask = 'glasses';
  } else if (id === 'recovery') {
    activeCase = 'adapt';
    adaptTask = 'teacup';
  } else activeCase = id;
  if (activeCase !== 'poc') changeCase(activeCase);
  document.getElementById('case-' + activeCase).scrollIntoView({ behavior: 'smooth' });
}
function renderCase() {
  for (const item of cases) renderCaseSection(item.id);
}
function renderCaseSection(activeCase) {
  const area = document.querySelector('#case-' + activeCase + ' .case-study-content');
  let html = '';
  if (activeCase === 'poc') {
    renderPoc(area);
    return;
  }
  if (activeCase === 'icl') {
    let frame = iclTask === 'frame';
    html = `<div class="case-heading"><div><h3>In-Context Learning Guide Task-Specific Manipulation</h3></div><div class="segmented" aria-label="ICL task"><button data-icl="frame" aria-pressed="${frame}">Frame Against Pen Holder</button><button data-icl="gear" aria-pressed="${!frame}">Install Gear</button></div></div><p class="case-description">${frame ? 'In the photo-frame task, zero-shot execution demonstrates reaching and moving the target, repeatedly adjusts its approach and wrist orientation without completing the required manipulation. After observing a demonstration, GPT-6-Astra adopts a more appropriate grasp orientation and coordinates both grippers to manipulate the frame, then positions the frame over the cup.' : 'In the gear installation task, zero-shot execution likewise demonstrates basic object-handling ability: GPT-6-Astra grasps and lifts the gear, but its placement attempts leave the gear outside the intended assembly position, and installation remains incomplete. With ICL, it positions the gear in the gap between the two existing gears, lowers it into place, releases it, and withdraws the gripper, leaving the gear installed.'}</p><div class="evidence-pair case-videos">${video(`media/cases/zero-shot-${iclTask}.mp4`, 'Zero-shot', '', 'No demo')}${video(`media/cases/icl-${iclTask}.mp4`, 'In-context learning', '', 'With demo')}</div><div class="case-insight"><p>Together, these cases suggest that in-context learning can supply task-specific geometric and procedural cues that help translate high-level task intent into executable interaction strategies. Their value lies not merely in clarifying what to manipulate, but in guiding how to grasp, bimanual coordinate, and place objects precisely to satisfy the task objective.</p><div class="icl-case-links"><button class="appendix-link" data-icl-package="${frame ? 'frame_against_pen_holder' : 'install_gear'}">Inspect the complete demonstration ${reportIcon('external-link')}</button><button class="appendix-link" data-appendix="ablation">Explore the paired ICL experiments ${reportIcon('external-link')}</button></div></div>`;
  } else {
    let glasses = adaptTask === 'glasses',
      suffix = glasses ? 'glasses' : 'teacup';
    html = `<div class="case-heading"><div><h3>${glasses ? 'Poorly precise manipulation of articulated objects' : 'Affordance-directed grasping and task-state recovery'}</h3></div><div class="segmented" aria-label="Adaptation task"><button data-adapt="teacup" aria-pressed="${!glasses}">Teacup to saucer</button><button data-adapt="glasses" aria-pressed="${glasses}">Put glass in glassbox</button></div></div><p class="case-description">${glasses ? 'The glasses packing task exposes a different limitation. GPT-6-Astra successfully performs the coarse bimanual transfer, while the breakdown occurs during the subsequent adjustments needed to fold the temples and close the lid. The temples remain protruding after manipulation, obstructing closure, and further corrective contacts do not resolve the packing problem. This rollout indicates the distinction between making planning toward a task goal and satisfying its final requirements: GPT-6-Astra completes the initial placement but struggles with the precise folding and alignment needed for closure. In the π₀.₅ rollout, the glasses are placed in the case and the temples are folded into a more compact state, although the lid remains open at the end. OpenWAM additionally completes lid closure after the folding sequence. These results highlight more accurate execution of the fine-grained manipulation by the specialized policies.' : 'In the teacup task, GPT-6-Astra initially targets the handle region and adjusts its wrist and gripper configuration across successive attempts before securing the teacup and teapot. This behavior is consistent with affordance-informed grasp selection and replanning. After initially placing the cup on the saucer, subsequent manipulation displaces it. GPT-6-Astra later revisits the cup, re-establishes a grasp, and carries it back toward the saucer, demonstrating a response to an invalidated state rather than simply continuing the preceding action sequence. In contrast, π₀.₅ performs repeated approach and retraction motions without completing the cup transfer. OpenWAM attempts to grasp the cup but failed, then moves the teapot onto the tray while leaving the cup off the saucer. The contrast therefore concerns not only object-handling ability, but whether ongoing execution is redirected to resolve unmet or disrupted task requirements.'}</p><div class="evidence-trio case-videos">${[
      [
        'astra',
        'GPT-6-Astra · Agent + ICL',
        glasses
          ? 'Initial transfer succeeds; protruding temples block closure.'
          : 'Handle-directed grasp, then return after displacement.',
      ],
      [
        'pi05',
        'π₀.₅ · VLA',
        glasses
          ? 'Temples folded; lid remains open.'
          : 'Repeated approach; cup transfer unresolved.',
      ],
      [
        'openwam',
        'OpenWAM · WAM',
        glasses
          ? 'Temples folded and case closed.'
          : 'Cup grasp fails; teapot moved, cup left off the saucer.',
      ],
    ]
      .map(([file, name, desc]) => video(`media/cases/${file}-${suffix}.mp4`, name, desc, ''))
      .join(
        '',
      )}</div><div class="stage-controls">${(glasses ? ['Initial state', 'Transfer', 'Adjustment', 'Outcome'] : ['Initial state', 'Approach', 'Task progress', 'Outcome']).map((s, i) => `<button data-stage="${i}">${s}</button>`).join('')}</div><div class="case-insight"><p>Together, the two tasks reveal complementary capability: GPT-6-Astra exhibits affordance-directed grasp selection, iterative adjustment, and recovery behavior, whereas the specialized policies execute the precision task more accurately. Broad task understanding and observation-conditioned revision do not by themselves guarantee precise physical execution; conversely, successful execution of a familiar action trajectory does not necessarily entail recovery when a task requirement remains unmet.</p></div>`;
  }
  area.innerHTML = html;
  updateCaseNarrative(activeCase, area);
  layoutCaseSelector(area);
  initVideos();
  enhanceCaseControls(area);
}
const notes = {
  sources: [
    'Model References',
    `<ol class="model-references"><li><strong>GPT-6-Astra</strong><p>OpenAI (2026). <cite>GPT-6 Astra: A new generation of intelligence</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://openai.com/index/gpt-6-astra/" target="_blank" rel="noopener">Official release ${reportIcon('external-link')}</a></div></li><li><strong>OpenWAM-α</strong><p>Wang et al. (2026). <cite>OpenWAM: An Open, Modular Exploration Towards Systematic World-Action Model Pretraining</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2609.07398" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/OpenWAM-Official/OpenWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>Qwen-RobotManip</strong><p>Qwen Team (2026). <cite>Qwen-RobotManip Technical Report: Alignment Unlocks Scale for Robotic Manipulation Foundation Models</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2606.17846" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/QwenLM/Qwen-RobotManip" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀.₅</strong><p>Physical Intelligence et al. (2025). <cite>π₀.₅: a Vision-Language-Action Model with Open-World Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2504.16054" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>InternVLA-A1.5</strong><p>InternVLA-A1.5 team (2026). <cite>InternVLA-A1.5: Unifying Understanding, Latent Foresight, and Action for Compositional Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://internrobotics.github.io/internvla-a15.github.io/reference-assets/paper/InternVLA_A1_5.pdf" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/InternRobotics/InternVLA-A-series" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀</strong><p>Black et al. (2024). <cite>π₀: A Vision-Language-Action Flow Model for General Robot Control</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2410.24164" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>GigaBrain-0.7</strong><p>GigaBrain Team et al. (2026). <cite>GigaBrain-0.7: Scaling Embodied Foundation Models to Emergent Capabilities with a Three-System Architecture</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2608.15875" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/open-gigaai/giga-brain-0" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>Fast-WAM</strong><p>Yuan et al. (2026). <cite>Fast-WAM: Do World Action Models Need Test-time Future Imagination?</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2603.16666" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/yuantianyuan01/FastWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li></ol><h3>Leaderboard snapshot · September 17, 2026</h3><p>The comparison uses seven attributable model submissions. GPT-6-Astra results are computed from the 510 retained episode outcomes. Headline SR and Score give equal weight to each of the 26 tasks.</p><h3>Reported totals and episode-derived values</h3><p><strong>Overall comparator values retain the leaderboard’s reported totals</strong> from its taskOverview responses. Per-task and task-group values are recomputed from episodeList records. In five models, the overall Score differs from the recomputed mean in the last displayed decimal; the difference does not change the ranking.</p><div class="table-scroll timing-measurements" tabindex="0" role="region" aria-label="Score source comparison"><table class="report-table report-table--plain"><thead><tr><th scope="col">Model</th><th scope="col">Reported overall Score</th><th scope="col">Mean of task Scores</th></tr></thead><tbody><tr><th scope="row">OpenWAM-α</th><td>0.7005</td><td>0.7006</td></tr><tr><th scope="row">Qwen-RobotManip</th><td>0.6081</td><td>0.6082</td></tr><tr><th scope="row">π₀.₅</th><td>0.5441</td><td>0.5442</td></tr><tr><th scope="row">π₀</th><td>0.4748</td><td>0.4747</td></tr><tr><th scope="row">Fast-WAM</th><td>0.3712</td><td>0.3711</td></tr></tbody></table></div><p>The archived responses do not explain the final-digit discrepancy; both values are shown.</p>`,
  ],
  protocol: [
    'Evaluation protocol',
    `<h3>Inputs and the action–observation loop</h3><p>GPT-6-Astra uses <code>high</code> reasoning effort, a single annotated demonstration per task, RGB views, end-effector and gripper state, base pose, and simulator timestep. Initial live views are overview, left wrist, and right wrist; later calls request a subset. Live depth, ground-truth object poses, calibration, segmentation, intermediate scores, and subgoal signals are not supplied. No learned VLA or WAM refines its requested actions.</p><p><strong>Model feedback follows a tool call, not each transport chunk.</strong> An <code>execute_eef</code> call can request up to six waypoints, each with up to 64 physics steps. The interface records and confirms execution in chunks of up to eight steps. The agent chooses its next action after the complete call returns with updated observations.</p><h3>Comparison scope</h3><div class="table-scroll timing-measurements protocol-scope" tabindex="0" role="region" aria-label="Evaluation protocol scope"><table class="report-table report-table--plain"><thead><tr><th scope="col">Item</th><th scope="col">Recorded comparison</th></tr></thead><tbody><tr><th scope="row">Task suite and metrics</th><td>26 test-mini tasks; 510 retained episodes per model; equal-weight task means.</td></tr><tr><th scope="row">GPT-6-Astra control</th><td>Direct EEF, gripper and base targets; server physics horizon; no extra aggregate token, call or wall-clock cap.</td></tr><tr><th scope="row">Learned policies</th><td>Seven attributable leaderboard submissions, retrieved September 17, 2026.</td></tr><tr><th scope="row">Model configurations</th><td>The archived leaderboard results do not establish identical camera inputs, control interfaces, scene revisions or inference budgets.</td></tr></tbody></table></div><h3>Retained cohort and execution recovery</h3><p>Each environment episode begins with a fresh model history. Infrastructure recovery may resume execution from confirmed history and observations. The final cohort contains <strong>510 unique task/seed results</strong>; resumed stages and terminal holding are parts of those episodes, not additional evaluation samples.</p><p>For <strong>apple from shelf</strong>, a corrected-scene run replaced the entire earlier set of 20 episodes. A <strong>utensils-to-holder / 013</strong> run affected by a receipt-routing infrastructure error was invalidated and replaced. The archived comparator records do not establish whether their apple scene revision matches that rerun.</p><p>When the policy stops before terminal evaluation, the runner holds the robot and advances the simulator to obtain the server result. <strong>49 episodes include holding, totaling 45,540 steps; six of those episodes finish successfully.</strong></p><p>Recorded execution routes are 108 API, 387 account-backed, and 15 API-to-account. Wall-time analysis separates these execution routes.</p><p><a class="source-link" href="data/evaluation-provenance.json" target="_blank" rel="noopener">Retained episode manifest, holding records And submission sources ${reportIcon('external-link')}</a></p><button class="appendix-link" data-appendix="limitations">Execution timing ${reportIcon('external-link')}</button>`,
  ],
  metrics: [
    'What the numbers mean',
    `<p><b>SR</b> measures server-side complete success. <b>Score</b> is normalized terminal partial credit under task-specific rules.</p><p>Headline values average 26 task means equally: SR 46.73%, Score 0.6537. There are 237 successes among 510 retained episodes; episode-weighted SR is 46.47%.</p><p>24 tasks have 20 instances; make_sandwich and microwave have 15 each. Attribute groups overlap and do not represent paired changes to identical tasks.</p>`,
  ],
  attributes: [
    'Task-attribute profiles',
    `${reportChart('precision')}${reportChart('mobility')}${reportChart('horizon')}<p>Precision: 14 low / 8 medium / 4 high tasks. Mobility: 19 mobile / 7 tabletop. Horizon: 19 short / 7 long. Groups overlap.</p><button class="appendix-link" data-appendix="results">View per-task results ${reportIcon('external-link')}</button>`,
  ],
  horizon: [
    'Long-horizon results and execution',
    `<p>GPT-6-Astra long-horizon SR is 28.10%, Score 0.5994; OpenWAM-α reaches 51.43% and 0.7872.</p><p>Detergent: GPT-6-Astra 55% SR / 0.8000 Score; OpenWAM 95% SR. Dishwasher: GPT-6-Astra 5% / 0.5333; OpenWAM 90% SR.</p><p>The agent sees elapsed timestep without a numeric remaining-step budget. Retries consume the fixed physics-step budget. A waypoint batch delays the next visual observation until it returns, linking recovery decisions to both the remaining execution budget and feedback timing.</p><p>Bottle and shop have zero complete successes across all eight models.</p>`,
  ],
  behavior: [
    'Behavioral evidence',
    `<h3>Contact correction · coffee beans / 013</h3><blockquote>“Angle spoon edge down to tabletop behind beans”</blockquote><p>This public action description accompanies height and tilt adjustments. Terminal Score 0.5, SR 0. The supplied prompt distinguishes local EEF height from tabletop height.</p><h3>Task–reference alignment · fruit / 015</h3><blockquote>“Carry the secured fruit above the small cup, not the large jug.”</blockquote><p>The live instruction requests a milkshake in the cup; the historical example uses a jug and explicitly defers to the live instruction. Score 0.6, SR 0. The recorded action follows the live instruction’s destination.</p><h3>Exploration and recovery</h3><p>The agent revises its approach and grasp using observations and action history within the episode.</p>`,
  ],
  limitations: [
    'Recorded execution timing',
    `<p>For the three recorded episodes below, simulated execution lasts <strong>34.70–116.67 seconds</strong>, while policy wall time spans <strong>729.84–5050.40 seconds</strong>. The longest action batches run for 2.13–6.40 simulated seconds before returning control to the agent.</p><div class="timing-chart" data-timing></div><p class="fineprint">Logarithmic scale.</p><div class="table-scroll timing-measurements" tabindex="0" role="region" aria-label="Selected episode execution times"><table class="report-table report-table--plain"><thead><tr><th scope="col">Episode</th><th scope="col">Physics steps</th><th scope="col">Simulation time (s)</th><th scope="col">Policy wall time (s)</th><th scope="col">Longest action batch (s)</th></tr></thead><tbody><tr><th scope="row">Apple → fruit bowl · 006</th><td>1,041</td><td>34.70</td><td>729.84</td><td>2.13</td></tr><tr><th scope="row">Coffee-bean collection · 013</th><td>3,500</td><td>116.67</td><td>5050.40</td><td>6.40</td></tr><tr><th scope="row">Utensils → holder · 000</th><td>2,000</td><td>66.67</td><td>2658.43</td><td>4.00</td></tr></tbody></table></div><p>Simulation time is calculated from the executed physics steps at 30 Hz. Policy wall time is the recorded elapsed duration, including both model and execution-system time; it is not an isolated inference-latency measurement. These three episodes have no terminal holding.</p>`,
  ],
};
function openAppendix(key) {
  if (key === 'icl') {
    openICLPackage();
    return;
  }
  $('#appendix-dialog').dataset.content = key;
  $('#appendix-dialog').classList.remove('icl-dialog');
  let content = notes[key];
  if (key === 'study-limitations')
    content = ['08 Study Limitations', $('#study-limitations-content').innerHTML];
  if (key === 'generalization')
    content = ['Across benchmark perturbations', kitComparisonTable('generalization')];
  if (key === 'full-comparison')
    content = ['All models and task groups', kitComparisonTable('main')];
  if (key === 'results') content = ['Task-level results And video evidence', taskResultsMarkup()];
  if (key === 'ablation') content = pairedICLContent();
  if (!content) return;
  $('#appendix-body').innerHTML = `<h2 id="appendix-title">${content[0]}</h2>${content[1]}`;
  if (!$('#appendix-dialog').open) $('#appendix-dialog').showModal();
  $('#appendix-body').scrollTop = 0;
  initCharts();
  initTaskTable();
  decorateAppendix(key);
  drawFigures($('#appendix-body'));
}
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !target.getAttribute('src')) {
        target.src = target.dataset.src + '#t=0.1';
        target.preload = 'metadata';
      }
      if (!isIntersecting) target.pause();
    }),
  { rootMargin: '200px' },
);
function initVideos() {
  document.querySelectorAll('video[data-src]').forEach((v) => {
    if (v.dataset.bound) return;
    v.dataset.bound = 'true';
    observer.observe(v);
    v.addEventListener('error', () => {
      if (!v.parentElement.querySelector('.video-error'))
        v.insertAdjacentHTML(
          'afterend',
          '<p class="video-error">Recording could not load. <a href="' +
            v.dataset.src +
            ('" target="_blank">Open video directly ' + reportIcon('external-link') + '</a></p>'),
        );
    });
  });
}
function changeCase(id) {
  const area = document.querySelector('#case-' + id + ' .case-study-content');
  area.querySelectorAll('video').forEach((v) => {
    v.pause();
    observer.unobserve(v);
  });
  renderCaseSection(id);
}
function layoutCaseSelector(area) {
  const choices = area.querySelector('.case-heading .segmented');
  const heading = area.querySelector('.case-heading h3');
  const h4 = document.createElement('h4');
  h4.innerHTML = heading.innerHTML;
  heading.replaceWith(h4);
  choices.className = 'case-recording-tabs';
  area.prepend(choices);
  const stages = area.querySelector('.stage-controls');
  if (stages) {
    const segments = document.createElement('div');
    segments.className = 'case-stage-tabs';
    segments.setAttribute('aria-label', 'Recording stage');
    stages.querySelectorAll('[data-stage]').forEach((button, i) => {
      button.type = 'button';
      button.setAttribute('aria-pressed', String(i === 0));
      segments.append(button);
    });
    stages.append(segments);
    initSegmentedControl(segments);
  }
  choices.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const buttons = [...choices.querySelectorAll('button')],
      i = buttons.indexOf(document.activeElement);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? buttons.length - 1
          : (i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
    buttons[next].click();
  });
}

document.addEventListener('click', (e) => {
  let el = e.target.closest('[data-appendix]');
  if (el) openAppendix(el.dataset.appendix);
  el = e.target.closest('[data-icl]');
  if (el) {
    iclTask = el.dataset.icl;
    changeCase('icl');
    document.querySelector('[data-icl="' + iclTask + '"]').focus({ preventScroll: true });
  }
  el = e.target.closest('[data-adapt]');
  if (el) {
    adaptTask = el.dataset.adapt;
    changeCase('adapt');
    document.querySelector('[data-adapt="' + adaptTask + '"]').focus({ preventScroll: true });
  }
  el = e.target.closest('[data-stage]');
  if (el) playCaseStage(el);
  el = e.target.closest('[data-task-video]');
  if (el) {
    let d = demos.find((x) => x.task === el.dataset.taskVideo);
    const dialog = $('#appendix-dialog');
    dialog.dataset.content = 'task-video';
    dialog.classList.remove('icl-dialog');
    $('#appendix-body').scrollTop = 0;
    $('#appendix-body').innerHTML =
      `<button class="appendix-link" data-appendix="results">← All task results</button><h2 id="appendix-title">${title(d.task)}</h2>${mainVideo(d.task, d.seed, 'GPT-6-Astra + ICL', '')}`;
    if (!$('#appendix-dialog').open) $('#appendix-dialog').showModal();
    initVideos();
  }
});

let caseStageRequest = 0;
async function playCaseStage(button) {
  const request = ++caseStageRequest;
  const area = button.closest('.case-study-content');
  if (!area?.isConnected) return;
  const times =
    adaptTask === 'glasses'
      ? [
          [0, 14, 46, 100],
          [0, 26, 51, 100],
          [0, 26, 49, 70.4],
        ]
      : [
          [0, 8.9, 38.5, 47],
          [0, 6, 29, 66.7],
          [0, 7, 35, 66.7],
        ];
  // Keep the requested evidence in view before the lazy-load observer can pause it.
  const videos = area.querySelector('.case-videos');
  videos.scrollIntoView({ block: 'center', behavior: 'instant' });
  area.querySelectorAll('[data-stage]').forEach((b) => {
    b.classList.toggle('active', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  await Promise.all(
    [...videos.querySelectorAll('video')].map(async (v, i) => {
      const figure = v.closest('.evidence-video');
      if (figure.hidden) return;
      const overlay = v.closest('.media-viewport')?.querySelector('.video-start');
      try {
        v.pause();
        v.muted = true;
        v.controls = true;
        v.preload = 'auto';
        // Strip the lazy thumbnail fragment before seeking, including a warm thumbnail.
        const sourceChanged = v.getAttribute('src') !== v.dataset.src;
        if (sourceChanged || v.readyState < 1) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => failed(), 15000);
            const cleanup = () => {
              clearTimeout(timeout);
              v.removeEventListener('loadedmetadata', loaded);
              v.removeEventListener('error', failed);
            };
            const loaded = () => {
                cleanup();
                resolve();
              },
              failed = () => {
                cleanup();
                reject(v.error || new Error('Recording metadata did not load'));
              };
            v.addEventListener('loadedmetadata', loaded, { once: true });
            v.addEventListener('error', failed, { once: true });
            if (sourceChanged) v.src = v.dataset.src;
            v.load();
          });
        }
        // A changed example, focus, or stage must not restart stale recordings.
        if (request !== caseStageRequest || !button.isConnected || figure.hidden) return;
        const duration = Number.isFinite(v.duration) ? v.duration : Infinity;
        v.currentTime = Math.min(times[i][Number(button.dataset.stage)], Math.max(0, duration - 3));
        if (overlay) overlay.hidden = true;
        await v.play();
      } catch {
        if (overlay && request === caseStageRequest && v.paused) overlay.hidden = false;
      }
    }),
  );
}

$('.close-dialog').addEventListener('click', () => $('#appendix-dialog').close());
$('#appendix-dialog').addEventListener('click', (e) => {
  if (e.target === $('#appendix-dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      e.target.close();
  }
});
$('#appendix-dialog').addEventListener('close', () =>
  $('#appendix-dialog')
    .querySelectorAll('video')
    .forEach((v) => v.pause()),
);
Promise.all(
  ['tasks', 'demo-videos', 'ablations', 'report-figures'].map((n) =>
    fetch('data/' + n + '.json').then((r) => {
      if (!r.ok) throw Error(n);
      return r.json();
    }),
  ),
)
  .then(([t, d, a, r]) => {
    tasks = t;
    demos = d;
    ablations = a;
    reportFigures = r;
    reportFigures.models.forEach((m) => {
      if (m.id === 'Astra (ICL)') m.label = 'GPT-6-Astra (ICL)';
      if (m.id === 'FastWAM') m.label = 'Fast-WAM';
    });
    renderAnalysis();
    renderCase();
    enhanceEvidence(document);
    initResearch();
    initNarrative();
    initShowcase();
    initRefresh();
  })
  .catch((error) => {
    console.error('Report initialization failed:', error);
    $('#mobile-content').innerHTML =
      '<p>Benchmark data could not load. Please reload the page.</p>';
  });
// Enlarge one camera pane without altering the original recording.
// These original interaction recordings are stitched overview / left wrist / right wrist.
function cameraPosition(video, view) {
  const source = (video.currentSrc || video.getAttribute('src') || video.dataset.src || '').split(
    /[?#]/,
  )[0];
  const file = source.split('/').pop();
  const overviewFirst =
    /(^|\/)media\/demos\//.test(source) ||
    [
      'collect_coffee_beans_009-web.mp4',
      'detergent_000-web.mp4',
      'dishwasher_009-web.mp4',
      'apple_to_fruit_bowl_003-web.mp4',
      'apple_to_fruit_bowl_009-web.mp4',
      'fruit_015-web.mp4',
      'apple_to_fruit_bowl_006-web.mp4',
      'collect_coffee_beans_013-web.mp4',
    ].includes(file);
  return overviewFirst
    ? { left: 'center', center: 'left', right: 'right', all: 'all' }[view] || view
    : view;
}
function enhanceCameraView(v) {
  if (v.videoWidth / v.videoHeight < 4 || v.dataset.cameraReady) return;
  v.dataset.cameraReady = 'true';
  v.dataset.view = cameraPosition(v, 'center');
  const bar = document.createElement('div');
  bar.className = 'camera-controls';
  bar.setAttribute('aria-label', 'Recording view');
  bar.innerHTML = [
    ['center', 'Overview'],
    ['left', 'Left wrist'],
    ['right', 'Right wrist'],
    ['all', 'All views'],
  ]
    .map(
      ([key, name]) =>
        `<button data-camera="${key}" aria-pressed="${key === 'center'}">${name}</button>`,
    )
    .join('');
  (v.closest('.media-viewport') || v).insertAdjacentElement('afterend', bar);
  initSegmentedControl(bar);
  initRecordingMultiview(
    v,
    ['center', 'left', 'right'].map(
      (key) => ({ left: 0, center: 1, right: 2 })[cameraPosition(v, key)],
    ),
  );
}
document.addEventListener(
  'loadedmetadata',
  (e) => {
    if (e.target.tagName === 'VIDEO') enhanceCameraView(e.target);
  },
  true,
);
document.querySelectorAll('video').forEach((v) => {
  if (v.readyState) enhanceCameraView(v);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-camera]');
  if (!b) return;
  const bar = b.parentElement,
    previous = bar.previousElementSibling,
    v = previous.tagName === 'VIDEO' ? previous : previous.querySelector('video');
  v.dataset.view = cameraPosition(v, b.dataset.camera);
  recordingMultiview.get(v)?.(b.dataset.camera === 'all');
  bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});

function playGroupLabel(playing) {
  return `${playing ? 'Pause' : 'Play'} both ${reportIcon(playing ? 'pause' : 'play')}`;
}

function enhanceEvidence(root) {
  root.querySelectorAll('.evidence-pair:not(.case-videos)').forEach((pair) => {
    if (pair.closest('.evidence-stage')) return;
    const stage = document.createElement('div');
    stage.className = 'evidence-stage';
    pair.before(stage);
    stage.innerHTML = `<div class="evidence-stage-heading"><span>OBSERVE THE EXECUTION</span><button type="button" class="play-group" aria-pressed="false">${playGroupLabel(false)}</button></div>`;
    stage.append(pair);
  });
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.play-group');
  if (!b) return;
  const videos = [...b.closest('.evidence-stage').querySelectorAll('video')];
  const play = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(play));
  b.innerHTML = playGroupLabel(play);
  for (const v of videos) {
    if (play) {
      v.muted = true;
      if (!v.src) v.src = v.dataset.src;
      try {
        await v.play();
      } catch {
        const playing = videos.some((video) => !video.paused && !video.ended);
        b.setAttribute('aria-pressed', String(playing));
        b.innerHTML = playGroupLabel(playing);
      }
    } else v.pause();
  }
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('.video-start');
  if (!b) return;
  const v = b.parentElement.querySelector('video');
  v.controls = true;
  try {
    await v.play();
  } catch {
    v.controls = true;
    b.hidden = true;
  }
});
document.addEventListener(
  'play',
  (e) => {
    if (e.target.tagName !== 'VIDEO' || e.target.dataset.customControls) return;
    e.target.controls = true;
    const b = e.target.closest('.media-viewport')?.querySelector('.video-start');
    if (b) b.hidden = true;
  },
  true,
);

for (const event of ['play', 'pause', 'ended'])
  document.addEventListener(
    event,
    (e) => {
      if (e.target.tagName !== 'VIDEO') return;
      const stage = e.target.closest('.evidence-stage');
      if (!stage) return;
      const playing = [...stage.querySelectorAll('video')].some((v) => !v.paused && !v.ended),
        button = stage.querySelector('.play-group');
      button.setAttribute('aria-pressed', String(playing));
      button.innerHTML = playGroupLabel(playing);
    },
    true,
  );

// Keep direct links to the limitations entrance opening the same report dialog.
const appendixAnchors = {
  '#study-limitations': 'study-limitations',
  '#model-references': 'sources',
};
function openLinkedAppendix() {
  const key = appendixAnchors[location.hash];
  if (key) openAppendix(key);
}
window.addEventListener('hashchange', openLinkedAppendix);
window.addEventListener('DOMContentLoaded', openLinkedAppendix);
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  const key = link && appendixAnchors[link.hash];
  if (key) openAppendix(key);
});

function decorateAppendix(key) {
  const body = $('#appendix-body');
  if (key === 'generalization')
    body
      .querySelector('h2')
      .insertAdjacentHTML(
        'afterend',
        '<div class="viz-figure" data-slopes data-viz-linked></div><div class="viz-legend"><span>Success rates across four perturbation conditions. GPT-6-Astra has the smallest observed range across conditions (6.60 percentage points), while OpenWAM-α leads under object, background and instruction perturbations. The comparison distinguishes consistency across conditions from absolute task success.</span></div>',
      );
  if (key === 'ablation') {
    const findings = body.querySelector('.icl-pair-findings');
    if (findings)
      findings.insertAdjacentHTML(
        'beforebegin',
        '<div class="icl-pair-chart" data-dumbbells="fresh"></div><div class="viz-legend"><span><i class="hollow"></i>Zero-shot Score</span><span><i class="filled"></i>Single-shot ICL Score</span><span>✓ marks a terminal success</span></div>',
      );
  }
}
function drawFigures(root = document) {
  root.querySelectorAll('[data-slopes]:not([data-ready])').forEach((host) => {
    host.dataset.ready = 'true';
    const draw = () => viz.perturbationSlopes(host, { models: reportFigures.models });
    draw();
    viz.resizeRedraw(host, draw);
  });
  root.querySelectorAll('[data-dumbbells]:not([data-ready])').forEach((host) => {
    host.dataset.ready = 'true';
    const which = host.dataset.dumbbells,
      pairs = ablations.pairs.filter((p) =>
        which === 'historical'
          ? p.experiment !== 'frame_gear_fresh'
          : p.experiment === 'frame_gear_fresh' && (which === 'fresh' || p.task === which),
      );
    const draw = () =>
      viz.pairedDumbbells(host, { pairs, compact: host.classList.contains('paired-mini-chart') });
    draw();
    viz.resizeRedraw(host, draw);
  });
  viz.bindTips(root === document ? document.body : root);
  if (typeof initTimingCharts === 'function') initTimingCharts(root);
}

function initRefresh() {
  viz.readingProgress();
  viz.sectionAnchors();
  drawFigures(document);
}
