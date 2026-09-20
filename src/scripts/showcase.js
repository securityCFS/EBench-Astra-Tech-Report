function initShowcase() {
  initSegmentedControl(document.querySelector('.limit-switch'), '[aria-pressed="true"]', {
    variant: 'underline',
  });
  document
    .querySelectorAll('.behavior-tabs')
    .forEach((tabs) =>
      initSegmentedControl(tabs, '[aria-selected="true"]', {
        variant: 'underline',
        keyboard: false,
      }),
    );
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-case]');
    if (link) {
      if (link.dataset.openCase === 'mobile') {
        document.getElementById('mobile').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      openSelectedCase(link.dataset.openCase);
    }
    const limit = e.target.closest('[data-limit]');
    if (limit) {
      document.querySelectorAll('#limits-content video').forEach((v) => {
        v.pause();
        observer.unobserve(v);
      });
      renderLimits(limit.dataset.limit);
      document
        .querySelectorAll('[data-limit]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === limit)));
    }
  });
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}
function enhanceCaseControls(area) {
  const videos = area.querySelector('.case-videos, .poc-videos');
  if (!videos || videos.dataset.caseControlsReady) return;
  const trio = videos.matches('.evidence-trio, .poc-videos');
  let tools = area.querySelector('.case-video-toolbar');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'case-video-toolbar';
    tools.innerHTML =
      (trio
        ? '<div class="case-model-tabs" aria-label="Focus a model"><button type="button" data-focus="all" aria-pressed="true">Compare all</button><button type="button" data-focus="0" aria-pressed="false">Astra</button><button type="button" data-focus="1" aria-pressed="false">π0.5</button><button type="button" data-focus="2" aria-pressed="false">OpenWAM</button></div>'
        : '') +
      `<button type="button" class="case-play" aria-pressed="false" aria-label="Play all">${reportIcon('play')}<span>Play all</span></button>`;
    videos.before(tools);
  }
  // Model changes reuse this toolbar; changing the example replaces its content.
  videos.dataset.caseControlsReady = 'true';
  const modelChoices = tools.querySelector('.case-model-tabs');
  initSegmentedControl(modelChoices, '[aria-pressed="true"]', { variant: 'underline' });
  const play = tools.querySelector('.case-play');
  const groupVideos = [...videos.querySelectorAll('video')];
  groupVideos.forEach((v) => {
    const overlay = v.closest('.media-viewport')?.querySelector('.video-start');
    if (overlay) overlay.innerHTML = reportIcon('play');
  });
  const syncPlayback = () => {
    const playing = groupVideos.some((v) => !v.paused && !v.ended);
    const label = playing ? 'Pause all' : 'Play all';
    play.innerHTML = `${reportIcon(playing ? 'pause' : 'play')}<span>${label}</span>`;
    play.setAttribute('aria-label', label);
    play.setAttribute('aria-pressed', String(playing));
  };
  for (const event of ['play', 'pause', 'ended', 'emptied', 'error'])
    videos.addEventListener(event, syncPlayback, true);
  tools.addEventListener('click', async (e) => {
    const focus = e.target.closest('[data-focus], [data-poc-focus]');
    if (focus) {
      const selected = focus.dataset.focus ?? focus.dataset.pocFocus;
      videos.dataset.focus = selected;
      modelChoices
        .querySelectorAll('button')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === focus)));
      videos.querySelectorAll('.evidence-video').forEach((fig, i) => {
        fig.hidden = selected !== 'all' && Number(selected) !== i;
        if (fig.hidden) fig.querySelector('video').pause();
      });
      syncPlayback();
      return;
    }
    if (!e.target.closest('.case-play')) return;
    const visible = groupVideos.filter((v) => !v.closest('.evidence-video').hidden);
    const start = !groupVideos.some((v) => !v.paused && !v.ended);
    if (!start) groupVideos.forEach((v) => v.pause());
    else
      await Promise.all(
        visible.map(async (v) => {
          v.muted = true;
          v.preload = 'auto';
          if (!v.getAttribute('src')) v.src = v.dataset.src;
          try {
            await v.play();
          } catch {
            v.controls = true;
          }
        }),
      );
    syncPlayback();
  });
  syncPlayback();
}
function kitComparisonTable(kind) {
  const general = kind === 'generalization',
    groups = general
      ? ['object', 'background', 'instruction', 'mix']
      : ['Low', 'Medium', 'High', 'Mobile', 'Fixed', 'Short Horizon', 'Long Horizon'],
    labels = general
      ? ['Object', 'Background', 'Instruction', 'Mixed']
      : ['Low', 'Medium', 'High', 'Mobile', 'Tabletop', 'Short', 'Long'];
  const cell = (v, best, metric = 'sr') =>
    `<td>${v === best ? '<strong>' : ''}${metric === 'sr' ? (v * 100).toFixed(2) + '%' : v.toFixed(4)}${v === best ? '</strong>' : ''}</td>`;
  const maxima = groups.map((g) =>
    Math.max(...reportFigures.models.map((m) => (general ? m.generalization[g] : m.groups[g]).sr)),
  );
  return `<p>${general ? 'Task-averaged success rates under object, background, instruction and mixed perturbations. These results compare the sensitivity of the evaluated models to changes in scene appearance, target objects and task specification.' : 'Overall performance and task-attribute comparisons across eight models. Success rate measures complete task execution; Score captures credited intermediate progress. The precision, mobility and horizon groups characterize where each model’s aggregate performance is gained or lost.'}</p><div class="table-scroll full-comparison" tabindex="0" role="region" aria-label="Scrollable benchmark comparison"><table class="report-table report-table--plain"><thead><tr><th rowspan="2">Model</th>${general ? '' : '<th colspan="2">Overall</th>'}${general ? '<th colspan="4">Perturbation SR</th>' : '<th colspan="3">Precision SR</th><th colspan="2">Mobility SR</th><th colspan="2">Horizon SR</th>'}</tr><tr>${general ? '' : '<th>SR</th><th>Score</th>'}${labels.map((l) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${reportFigures.models.map((m) => `<tr class="${m.id === 'Astra (ICL)' ? 'highlight' : ''}"><th scope="row">${m.label}</th>${general ? '' : cell(m.sr, Math.max(...reportFigures.models.map((m) => m.sr))) + cell(m.score, Math.max(...reportFigures.models.map((m) => m.score)), 'score')}${groups.map((g, i) => cell((general ? m.generalization[g] : m.groups[g]).sr, maxima[i])).join('')}</tr>`).join('')}</tbody></table></div><p class="fineprint">${general ? 'In the mixed condition, GPT-6-Astra completes 60 of 130 episodes and OpenWAM-α completes 58.' : '26 tasks / 510 episodes per model. Precision: 14 / 8 / 4 tasks; mobility: 19 / 7; horizon: 19 / 7. Attribute groups overlap.'}</p><a class="appendix-link" href="data/report-${general ? 'generalization' : 'main-results'}.csv" download>Download source table CSV ${reportIcon('external-link')}</a>`;
}
