const $ = (s) => document.querySelector(s);
// Task names follow the appendix tables of the paper, carried in report-figures.json.
const title = (s) =>
  reportFigures.tasks?.find((t) => t.task === s)?.label ??
  s.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
const pct = (n) => (Number(n) * 100).toFixed(1).replace(/\.0$/, '');
let tasks = [],
  demos = [],
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
    `${d.sr ? 'Success' : 'Unsuccessful'} (Score ${d.score.toFixed(2)})`,
  );
}
function renderAnalysis() {
  $('#mobile-content').innerHTML =
    `<div class="evidence-pair">${mainVideo('remote_to_holder', '000', 'Remote', 'Task SR: direct control 100%, InternW0-Δ 85%.')}${mainVideo('bookmark_on_book', '000', 'Bookmark', 'Task SR: direct control 90%, π₀.₅ 55%.')}</div>`;
  renderLimits('precision');
  initVideos();
}
function renderLimits(kind) {
  const precision = kind === 'precision';
  $('#limits-content').innerHTML =
    `<div class="evidence-pair">${precision ? mainVideo('peg_in_hole', '000', 'Peg in hole', 'The peg remains exposed.') + mainVideo('peg_in_hole', '002', 'Peg in hole', 'One of 4 successes in 20 episodes.') : mainVideo('bottle', '003', 'Bottle', 'Some bottles remain outside the basket.') + mainVideo('dishwasher', '011', 'Dishwasher', 'The only success in 20 direct-control episodes.')}</div>`;
  initVideos();
  enhanceEvidence($('#limits-content'));
}
const cases = ['icl', 'adapt', 'poc'];
let activeCase = 'icl',
  iclTask = 'frame',
  adaptTask = 'teacup';
function renderCase() {
  for (const id of cases) renderCaseSection(id);
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
    html = `<div class="case-heading"><div><h3>With and without the annotated demonstration</h3></div><div class="segmented" aria-label="ICL task"><button data-icl="frame" aria-pressed="${frame}">Frame</button><button data-icl="gear" aria-pressed="${!frame}">Gear</button></div></div><div class="evidence-pair case-videos">${video(`media/cases/zero-shot-${iclTask}.mp4`, 'Zero-shot', '', '')}${video(`media/cases/icl-${iclTask}.mp4`, 'With demonstration', '', '')}</div><p class="case-description"></p>`;
  } else {
    let glasses = adaptTask === 'glasses',
      suffix = glasses ? 'glasses' : 'teacup';
    html = `<div class="case-heading"><div><h3>${glasses ? 'Precise contact in object manipulation' : 'Recovery from subgoal disruptions'}</h3></div><div class="segmented" aria-label="Adaptation task"><button data-adapt="teacup" aria-pressed="${!glasses}">Teacup &amp; teapot</button><button data-adapt="glasses" aria-pressed="${glasses}">Glass into box</button></div></div><div class="evidence-trio case-videos">${[
      [
        'astra',
        'GPT-6-Astra · Direct control',
        glasses
          ? 'Glasses in the case, a protruding temple blocks the lid.'
          : 'Handle-directed grasp, then return after displacement.',
      ],
      [
        'pi05',
        'π₀.₅ · VLA',
        glasses ? 'Temples folded, lid left open.' : 'Repeated approaches, cup never transferred.',
      ],
      [
        'openwam',
        'OpenWAM-α · WAM',
        glasses
          ? 'Temples folded and case closed.'
          : 'Cup grasp fails, teapot placed without the cup.',
      ],
    ]
      .map(([file, name, desc]) => video(`media/cases/${file}-${suffix}.mp4`, name, desc, ''))
      .join('')}</div><p class="case-description"></p>`;
  }
  area.innerHTML = html;
  updateCaseNarrative(activeCase, area);
  layoutCaseSelector(area);
  initVideos();
  enhanceCaseControls(area);
}
let taskVideoReturnContext = null;

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
  let el = e.target.closest('[data-icl]');
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
    `<button type="button" class="appendix-link" data-close-task-video>${reportIcon('chevron-left')} Back to results</button><h2 id="appendix-title">${title(demo.task)}</h2>${mainVideo(demo.task, demo.seed, 'GPT-6-Astra', '')}`;
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
  ['tasks', 'demo-videos', 'report-figures'].map((n) =>
    fetch('data/' + n + '.json').then((r) => {
      if (!r.ok) throw Error(n);
      return r.json();
    }),
  ),
)
  .then(([t, d, r]) => {
    tasks = t;
    demos = d;
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
      'dishwasher_009-web.mp4',
      'apple_to_fruit_bowl_003-web.mp4',
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

function initRefresh() {
  viz.readingProgress();
  viz.sectionAnchors();
}
