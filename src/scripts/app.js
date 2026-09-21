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
    `<div class="finding-grid"><div class="finding-story"></div></div><div class="evidence-pair">${mainVideo('remote_to_holder', '000', 'Remote to holder', 'GPT-6-Astra 100% task SR; OpenWAM-α 65%.')}${mainVideo('bookmark_on_book', '000', 'Bookmark placement', 'GPT-6-Astra 90% task SR; next-best π₀.₅ 55%.')}</div>`;
  renderLimits('precision');
  initVideos();
  initCharts();
}
function renderLimits(kind) {
  const precision = kind === 'precision';
  $('#limits-content').innerHTML =
    `<div class="finding-grid"><div class="finding-story"></div>${reportChart(precision ? 'precision' : 'horizon')}</div><div class="evidence-pair">${precision ? mainVideo('peg_in_hole', '000', 'Peg insertion', 'The peg remains exposed.') + mainVideo('peg_in_hole', '002', 'Peg insertion', 'One of four successes in 20 task instances.') : mainVideo('bottle', '003', 'Bottle placement', 'Some bottles remain outside the tray.') + mainVideo('dishwasher', '011', 'Dishwasher', 'Only one success in 20 GPT-6-Astra episodes.')}</div>`;
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
      )}</div><div class="case-insight"><p>Together, the two tasks reveal complementary capability: GPT-6-Astra exhibits affordance-directed grasp selection, iterative adjustment, and recovery behavior, whereas the specialized policies execute the precision task more accurately. Broad task understanding and observation-conditioned revision do not by themselves guarantee precise physical execution; conversely, successful execution of a familiar action trajectory does not necessarily entail recovery when a task requirement remains unmet.</p></div>`;
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
    `<ol class="model-references"><li><strong>GPT-6-Astra</strong><p>OpenAI (2026). <cite>GPT-6 Astra: A new generation of intelligence</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://openai.com/index/gpt-6-astra/" target="_blank" rel="noopener">Official release ${reportIcon('external-link')}</a></div></li><li><strong>OpenWAM-α</strong><p>Wang et al. (2026). <cite>OpenWAM: An Open, Modular Exploration Towards Systematic World-Action Model Pretraining</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2609.07398" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/OpenWAM-Official/OpenWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>Qwen-RobotManip</strong><p>Qwen Team (2026). <cite>Qwen-RobotManip Technical Report: Alignment Unlocks Scale for Robotic Manipulation Foundation Models</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2606.17846" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/QwenLM/Qwen-RobotManip" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀.₅</strong><p>Physical Intelligence et al. (2025). <cite>π₀.₅: a Vision-Language-Action Model with Open-World Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2504.16054" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>InternVLA-A1.5</strong><p>InternVLA-A1.5 team (2026). <cite>InternVLA-A1.5: Unifying Understanding, Latent Foresight, and Action for Compositional Generalization</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://internrobotics.github.io/internvla-a15.github.io/reference-assets/paper/InternVLA_A1_5.pdf" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/InternRobotics/InternVLA-A-series" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>π₀</strong><p>Black et al. (2024). <cite>π₀: A Vision-Language-Action Flow Model for General Robot Control</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2410.24164" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/Physical-Intelligence/openpi" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>GigaBrain-0.7</strong><p>GigaBrain Team et al. (2026). <cite>GigaBrain-0.7: Scaling Embodied Foundation Models to Emergent Capabilities with a Three-System Architecture</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2608.15875" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/open-gigaai/giga-brain-0" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li><li><strong>Fast-WAM</strong><p>Yuan et al. (2026). <cite>Fast-WAM: Do World Action Models Need Test-time Future Imagination?</cite>.</p><div class="model-reference-links"><a class="source-link" href="https://arxiv.org/abs/2603.16666" target="_blank" rel="noopener">Paper ${reportIcon('external-link')}</a><a class="source-link" href="https://github.com/yuantianyuan01/FastWAM" target="_blank" rel="noopener">GitHub ${reportIcon('external-link')}</a></div></li></ol>`,
  ],

  metrics: [
    'What the numbers mean',
    `<p><b>SR</b> measures server-side complete success. <b>Score</b> is normalized terminal partial credit under task-specific rules.</p><p>Headline values average 26 task means equally: SR 46.73%, Score 0.6537. There are 237 successes among 510 retained episodes; episode-weighted SR is 46.47%.</p><p>24 tasks have 20 instances; make_sandwich and microwave have 15 each. Attribute groups overlap and do not represent paired changes to identical tasks.</p>`,
  ],
};
let taskVideoReturnContext = null;

function openAppendix(key) {
  if (key === 'icl') {
    openICLPackage();
    return;
  }
  let content = notes[key];
  if (key === 'ablation') content = pairedICLContent();
  if (!content) return;
  taskVideoReturnContext = null;
  $('#appendix-dialog').dataset.content = key;
  $('#appendix-dialog').classList.remove('icl-dialog');
  $('#appendix-body').innerHTML = `<h2 id="appendix-title">${content[0]}</h2>${content[1]}`;
  if (!$('#appendix-dialog').open) $('#appendix-dialog').showModal();
  $('#appendix-body').scrollTop = 0;
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
  el = e.target.closest('[data-task-video]');
  if (el) openTaskVideo(el);
});

function openTaskVideo(trigger) {
  const demo = demos.find((item) => item.task === trigger.dataset.taskVideo);
  if (!demo) return;
  const dialog = $('#appendix-dialog');
  const table = trigger.closest('.table-scroll, .insight-table-scroll');
  taskVideoReturnContext = {
    trigger,
    x: window.scrollX,
    y: window.scrollY,
    table,
    tableLeft: table?.scrollLeft,
    tableTop: table?.scrollTop,
  };
  trigger.focus({ preventScroll: true });
  dialog.querySelectorAll('video').forEach((video) => video.pause());
  dialog.dataset.content = 'task-video';
  dialog.classList.remove('icl-dialog');
  $('#appendix-body').innerHTML =
    `<button type="button" class="appendix-link" data-close-task-video>${reportIcon('chevron-left')} Back to results</button><h2 id="appendix-title">${title(demo.task)}</h2>${mainVideo(demo.task, demo.seed, 'GPT-6-Astra-ICL', '')}`;
  if (!dialog.open) dialog.showModal();
  $('#appendix-body').scrollTop = 0;
  initVideos();
}

$('.close-dialog').addEventListener('click', () => $('#appendix-dialog').close());
$('#appendix-dialog').addEventListener('click', (e) => {
  if (e.target.closest('[data-close-task-video]')) {
    e.currentTarget.close();
    return;
  }
  if (e.target === $('#appendix-dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      e.target.close();
  }
});
$('#appendix-dialog').addEventListener('close', () => {
  $('#appendix-dialog')
    .querySelectorAll('video')
    .forEach((video) => {
      video.pause();
      observer.unobserve(video);
    });
  const context = taskVideoReturnContext;
  taskVideoReturnContext = null;
  if (!context) return;
  if (context.trigger.isConnected) context.trigger.focus({ preventScroll: true });
  if (context.table?.isConnected) {
    context.table.scrollLeft = context.tableLeft;
    context.table.scrollTop = context.tableTop;
  }
  window.scrollTo({ left: context.x, top: context.y, behavior: 'instant' });
});
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
  return overviewFirst ? { left: 'center', center: 'left', right: 'right' }[view] || view : view;
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
  ]
    .map(
      ([key, name]) =>
        `<button data-camera="${key}" aria-pressed="${key === 'center'}">${name}</button>`,
    )
    .join('');
  (v.closest('.media-viewport') || v).insertAdjacentElement('afterend', bar);
  initSegmentedControl(bar);
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

// Keep the Model References anchor opening its shared dialog.
const appendixAnchors = {
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
}

function initRefresh() {
  viz.readingProgress();
  viz.sectionAnchors();
  drawFigures(document);
}
