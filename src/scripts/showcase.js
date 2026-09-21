function initShowcase() {
  initSegmentedControl(document.querySelector('.limit-switch'), '[aria-pressed="true"]', {
    variant: 'underline',
  });
  document.querySelectorAll('.behavior-tabs').forEach((tabs) =>
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
