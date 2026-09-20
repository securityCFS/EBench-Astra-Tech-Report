// Whole-episode public actions, synchronized by recorded execution chunks.
(() => {
  const root = document.querySelector('.execution-demo #episode-viewer');
  if (!root) return;
  const picker = root.querySelector('.episode-picker');
  const content = root.querySelector('[data-episode-content]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const time = (value) =>
    `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  const icon = (name) => `<span class="episode-icon" aria-hidden="true">${reportIcon(name)}</span>`;
  const actionName = (call) =>
    call.arguments.reason ||
    `${call.arguments.opening === 0 ? 'Close' : call.arguments.opening === 1 ? 'Open' : 'Adjust'} the ${call.arguments.side} gripper`;
  let entries = [],
    episode,
    selectedId,
    index = 0,
    request = 0,
    controller,
    segmentEnd = null,
    pendingSeek = null,
    visibilityObserver,
    inView = false,
    userPaused = reducedMotion.matches,
    camera = '0',
    speed = 1,
    layoutFrame = null,
    stopFrames = () => {};
  const get = async (path, signal) => {
    const response = await fetch(path, { signal });
    if (!response.ok) throw Error('Episode data unavailable');
    return response.json();
  };

  // Indicators live outside the replaceable content (the camera indicator is never
  // replaced when changing cameras). Measure actual buttons, including wrapped text.
  function positionIndicator(group, selector, indicatorSelector) {
    if (!group || group.hidden) return;
    const selected = group.querySelector(`${selector}[aria-pressed="true"]`);
    const indicator = group.querySelector(indicatorSelector);
    if (!selected || !indicator) return;
    indicator.style.width = `${selected.offsetWidth}px`;
    indicator.style.transform = `translateX(${selected.offsetLeft}px)`;
    group.dataset.positioned = 'true';
  }
  function layout() {
    positionIndicator(picker, '[data-episode]', '.episode-picker-indicator');
    positionIndicator(
      root.querySelector('.episode-cameras'),
      '[data-episode-camera]',
      '.episode-camera-indicator',
    );
    const rail = root.querySelector('.episode-chapters');
    if (!rail) return;
    const width = rail.clientWidth;
    const bounds = root.querySelector('.episode-timeline').getBoundingClientRect();
    const railBounds = rail.getBoundingClientRect();
    rail.style.setProperty('--chapter-label-max', `${bounds.width}px`);
    const laneEnds = [];
    // Nearby chapters retain their true time position, but use separate rows so
    // their 44px touch/keyboard targets never overlap, even on narrow screens.
    rail.querySelectorAll('[data-chapter]').forEach((button) => {
      const x = 8 + Number(button.dataset.position) * Math.max(0, width - 16);
      let lane = laneEnds.findIndex((end) => x - end >= 46);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = x;
      button.style.left = `${x}px`;
      button.style.top = `${lane * 44}px`;
      const tooltip = button.querySelector('.episode-chapter-label');
      const tooltipWidth = tooltip.offsetWidth;
      const center = railBounds.left + x;
      const left = Math.max(
        bounds.left,
        Math.min(center - tooltipWidth / 2, bounds.right - tooltipWidth),
      );
      tooltip.style.left = `${left - center + 22}px`;
    });
    rail.style.height = `${Math.max(1, laneEnds.length) * 44}px`;
  }
  function scheduleLayout() {
    if (layoutFrame !== null) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null;
      layout();
    });
  }
  const resizeObserver = new ResizeObserver(scheduleLayout);
  function observeLayout() {
    resizeObserver.disconnect();
    resizeObserver.observe(root);
    root
      .querySelectorAll(
        '.episode-picker, .episode-picker button, .episode-cameras, .episode-cameras button, .episode-chapters',
      )
      .forEach((element) => resizeObserver.observe(element));
    scheduleLayout();
  }
  document.fonts?.ready.then(scheduleLayout);
  window.addEventListener('resize', scheduleLayout);

  async function load(id) {
    const token = ++request;
    controller?.abort();
    controller = new AbortController();
    selectedId = id;
    stopFrames();
    visibilityObserver?.disconnect();
    inView = false;
    content.querySelector('video')?.pause();
    episode = null;
    picker
      .querySelectorAll('[data-episode]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.episode === id)),
      );
    positionIndicator(picker, '[data-episode]', '.episode-picker-indicator');
    content.setAttribute('aria-busy', 'true');
    content.innerHTML = '<p class="episode-state" role="status">Loading the episode…</p>';
    observeLayout();
    try {
      const data = await get(`data/episodes/${encodeURIComponent(id)}.json`, controller.signal);
      if (token !== request) return;
      episode = data;
      index = 0;
      segmentEnd = null;
      pendingSeek = null;
      userPaused = reducedMotion.matches;
      render();
    } catch (error) {
      if (token === request && error.name !== 'AbortError') {
        content.innerHTML =
          '<div class="episode-state"><p role="alert">The episode could not be loaded. Choose another episode or try again.</p><button type="button" data-episode-retry>Retry</button></div>';
        observeLayout();
      }
    } finally {
      if (token === request) content.setAttribute('aria-busy', 'false');
    }
  }

  function render() {
    content.innerHTML = `<div class="episode-heading"><div class="episode-task"><h4>${escape(episode.instruction)}</h4><details class="episode-prompt-disclosure"><summary>${icon('chevron-down')}Initial task prompt</summary><div class="episode-prompt" tabindex="0">${escape(episode.initial_prompt)}</div></details></div><span class="episode-outcome" data-success="${Boolean(episode.result.sr)}">${episode.result.sr ? `${icon('check')}Successful` : 'Incomplete'}<small>Final score ${episode.result.score.toFixed(1)}</small></span></div>
      <div class="episode-stage">
        <div class="episode-screen">
          <div class="episode-cameras" role="group" aria-label="Video camera"><span class="episode-camera-indicator" aria-hidden="true"></span>${['Overview', 'Left wrist', 'Right wrist', 'All views'].map((label, i) => `<button type="button" data-episode-camera="${i === 3 ? 'all' : i}" aria-pressed="${camera === (i === 3 ? 'all' : String(i))}">${label}</button>`).join('')}</div>
          <div class="episode-viewport"><video data-camera-ready="true" data-custom-controls="true" preload="metadata" muted loop playsinline src="${escape(episode.video)}" aria-label="Recorded execution: ${escape(episode.instruction)}"></video><div class="episode-multiview">${['Overview', 'Left wrist', 'Right wrist'].map((label, i) => `<figure><canvas data-camera-tile="${i}" role="img" aria-label="${label} camera"></canvas><figcaption>${label}</figcaption></figure>`).join('')}</div></div>
          <p class="episode-caption" role="status"></p>
        </div>
        <div class="episode-interaction" role="region" aria-label="Current interaction" tabindex="0"><div data-interaction></div></div>
      </div>
      <div class="episode-controls">
        <div class="episode-playback">
          <div class="episode-transport" role="group" aria-label="Episode playback"><button type="button" data-play aria-label="Play episode">${icon('play')}</button><span class="episode-control-divider" aria-hidden="true"></span><button type="button" data-prev aria-label="Previous interaction">${icon('chevron-left')}</button><span data-counter></span><button type="button" data-next aria-label="Next interaction">${icon('chevron-right')}</button></div>
          <div class="episode-playback-meta"><output data-time aria-live="off">0:00 / ${time(episode.duration)}</output><select data-speed aria-label="Playback speed">${[0.5, 1, 2].map((rate) => `<option value="${rate}"${speed === rate ? ' selected' : ''}>${rate}×</option>`).join('')}</select></div>
        </div>
        <div class="episode-timeline"><div class="episode-scrubber"><input data-seek type="range" min="0" max="${episode.duration}" step="0.01" value="0" aria-label="Video position" aria-valuetext="0:00 of ${time(episode.duration)}"><div class="episode-chapters" role="group" aria-label="Episode chapters">${episode.bookmarks
          .map((bookmark) => {
            const start = episode.calls[bookmark.call - 1].video_start;
            return `<button type="button" class="episode-chapter" data-chapter data-call="${bookmark.call - 1}" data-position="${Math.max(0, Math.min(1, start / episode.duration))}" aria-label="Seek to ${escape(bookmark.label)}, ${time(start)}"><span class="episode-chapter-label" aria-hidden="true">${escape(bookmark.label)}<small>${time(start)}</small></span></button>`;
          })
          .join('')}</div></div></div>
      </div>
      <details class="episode-log"><summary>${icon('chevron-down')}Full interaction timeline · ${episode.calls.length} calls</summary><ol tabindex="0" aria-label="Complete interaction timeline">${episode.calls.map((call, i) => `<li><button type="button" data-call="${i}"><time>${time(call.video_start)}</time><span>${escape(actionName(call))}</span></button></li>`).join('')}</ol></details>
      <div class="episode-source-links"><button type="button" data-icl-package="${escape(episode.task)}">${icon('book-open')}Historical ICL input${icon('external-link')}</button><a href="data/episodes/${escape(episode.id)}.json" download>${icon('download')}Download public interaction log</a></div>`;
    const video = content.querySelector('video');
    const current = () => content.querySelector('video') === video;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playbackRate = speed;
    let frameHandle = null;
    const useVideoFrames = typeof video.requestVideoFrameCallback === 'function';
    stopFrames = () => {
      if (frameHandle !== null) {
        if (useVideoFrames) video.cancelVideoFrameCallback(frameHandle);
        else cancelAnimationFrame(frameHandle);
        frameHandle = null;
      }
    };
    const frame = () => {
      frameHandle = null;
      if (!current()) return;
      drawViews(video);
      if (!video.paused)
        frameHandle = useVideoFrames
          ? video.requestVideoFrameCallback(frame)
          : requestAnimationFrame(frame);
    };
    video.addEventListener('play', () => {
      if (!current()) return;
      stopFrames();
      frame();
    });
    video.addEventListener('pause', () => {
      if (!current()) return;
      stopFrames();
      drawViews(video);
    });
    video.addEventListener('loadedmetadata', () => {
      if (!current()) return;
      if (pendingSeek !== null) seekTo(pendingSeek);
    });
    for (const event of ['loadeddata', 'seeked'])
      video.addEventListener(event, () => {
        if (!current()) return;
        drawViews(video);
        if (!video.error) setCaption('');
        updateProgress();
      });
    video.addEventListener('timeupdate', () => {
      if (!current() || pendingSeek !== null) return;
      if (segmentEnd !== null && video.currentTime >= segmentEnd) {
        const end = segmentEnd;
        segmentEnd = null;
        userPaused = true;
        video.pause();
        video.currentTime = end;
      }
      updateProgress();
    });
    for (const event of ['play', 'pause', 'ended'])
      video.addEventListener(event, () => {
        if (!current()) return;
        const button = root.querySelector('[data-play]');
        const label = video.paused ? 'Play episode' : 'Pause episode';
        if (button.getAttribute('aria-label') !== label) {
          button.innerHTML = icon(video.paused ? 'play' : 'pause');
          button.setAttribute('aria-label', label);
        }
      });
    video.addEventListener('playing', () => {
      if (current()) setCaption('');
    });
    video.addEventListener('error', () => {
      if (!current()) return;
      setCaption('Video unavailable. The complete interaction log remains available below.');
      root
        .querySelectorAll('[data-play], [data-play-call], [data-seek], [data-speed]')
        .forEach((control) => {
          control.disabled = true;
        });
      pendingSeek = null;
    });
    renderCall();
    setCamera(camera);
    observeLayout();
    visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (!current()) return;
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        syncPlayback();
      },
      { threshold: [0, 0.25] },
    );
    visibilityObserver.observe(root.querySelector('.episode-viewport'));
    video.addEventListener('canplay', () => {
      if (!current()) return;
      setCaption('');
      syncPlayback();
    });
  }

  // Every tile is cropped from the same decoded frame, so the cameras cannot drift.
  function drawViews(video) {
    if (
      video.readyState < 2 ||
      !video.isConnected ||
      !video.parentElement.classList.contains('all-views')
    )
      return;
    const width = video.videoWidth / 3,
      height = video.videoHeight;
    root.querySelectorAll('[data-camera-tile]').forEach((canvas) => {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      canvas
        .getContext('2d')
        ?.drawImage(
          video,
          Number(canvas.dataset.cameraTile) * width,
          0,
          width,
          height,
          0,
          0,
          width,
          height,
        );
    });
  }
  function setCamera(value) {
    camera = value;
    const video = root.querySelector('video');
    const all = camera === 'all';
    video.parentElement.classList.toggle('all-views', all);
    video.style.transform = all ? 'none' : `translateX(-${(Number(camera) * 100) / 3}%)`;
    video.setAttribute('aria-hidden', String(all));
    root
      .querySelectorAll('[data-episode-camera]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.episodeCamera === camera)),
      );
    if (all) drawViews(video);
    positionIndicator(
      root.querySelector('.episode-cameras'),
      '[data-episode-camera]',
      '.episode-camera-indicator',
    );
    scheduleLayout();
  }
  function renderCall() {
    const call = episode.calls[index],
      reason = call.arguments.reason,
      result = call.response.episode_results[0];
    const detailsOpen = root.querySelector('.episode-raw')?.open;
    const previousInteraction = root.querySelector('[data-interaction]');
    const focused = previousInteraction.contains(document.activeElement)
      ? document.activeElement.matches('[data-play-call]')
        ? '[data-play-call]'
        : document.activeElement.matches('summary')
          ? 'summary'
          : null
      : null;
    root.querySelector('[data-counter]').textContent =
      `Interaction ${index + 1} / ${episode.calls.length}`;
    root.querySelector('[data-prev]').disabled = index === 0;
    root.querySelector('[data-next]').disabled = index === episode.calls.length - 1;
    previousInteraction.innerHTML = `<p class="episode-speaker">GPT-6-Astra <span>${escape(call.tool)}</span></p>${reason ? `<blockquote>${escape(reason)}</blockquote>` : `<p class="episode-no-reason">${escape(actionName(call))}</p>`}<div class="episode-return"><strong>Tool response</strong><p>${call.response.success ? 'Command executed.' : 'Command reported a failure.'} Steps ${call.start_step}–${call.end_step}.</p>${result ? `<p class="episode-terminal"><strong>Evaluator: ${result.sr ? 'task successful' : 'task incomplete'} · score ${result.score.toFixed(1)}</strong></p>` : ''}</div><button type="button" class="episode-play-call" data-play-call${root.querySelector('video').error ? ' disabled' : ''}>${icon('play')}Play this action</button><details class="episode-raw"${detailsOpen ? ' open data-restored-open' : ''}><summary>${icon('chevron-down')}Exact tool arguments & response</summary><pre tabindex="0">${escape(JSON.stringify({ tool: call.tool, arguments: call.arguments, response_summary: call.response }, null, 2))}</pre></details>`;
    if (focused) previousInteraction.querySelector(focused)?.focus({ preventScroll: true });
    const chapter = episode.bookmarks.filter((bookmark) => bookmark.call - 1 <= index).at(-1);
    root.querySelectorAll('[data-call]').forEach((button) => {
      const active =
        Number(button.dataset.call) ===
        (button.hasAttribute('data-chapter') ? chapter?.call - 1 : index);
      button.setAttribute('aria-current', String(active));
    });
  }
  function updateProgress(position) {
    const video = root.querySelector('video');
    if (!episode || !video) return;
    const seconds = Math.max(
      0,
      Math.min(episode.duration, position ?? pendingSeek ?? video.currentTime),
    );
    const seek = root.querySelector('[data-seek]');
    seek.value = seconds;
    seek.style.setProperty('--progress', `${(seconds / episode.duration) * 100}%`);
    root.querySelector('[data-time]').textContent = `${time(seconds)} / ${time(episode.duration)}`;
    const next =
      seconds >= episode.duration
        ? episode.calls.length - 1
        : episode.calls.findIndex(
            (call) => seconds >= call.video_start && seconds < call.video_end,
          );
    if (next >= 0 && next !== index) {
      index = next;
      renderCall();
    }
    seek.setAttribute(
      'aria-valuetext',
      `${time(seconds)} of ${time(episode.duration)}; interaction ${index + 1} of ${episode.calls.length}`,
    );
  }
  function seekTo(seconds) {
    const video = root.querySelector('video');
    if (!video || !episode) return;
    const target = Math.max(0, Math.min(episode.duration, seconds));
    pendingSeek = video.readyState === 0 && !video.error ? target : null;
    if (!video.error && video.readyState > 0) video.currentTime = target;
    updateProgress(target);
  }
  function select(i) {
    const video = root.querySelector('video');
    if (!episode || !video) return;
    video.pause();
    segmentEnd = null;
    index = Math.max(0, Math.min(episode.calls.length - 1, i));
    seekTo(episode.calls[index].video_start);
    renderCall();
    syncPlayback();
  }
  function setCaption(message) {
    const caption = root.querySelector('.episode-caption');
    if (caption) caption.textContent = message;
  }
  function syncPlayback() {
    const video = root.querySelector('video');
    if (!video || video.error) return;
    if (inView && !document.hidden && !userPaused) play(video);
    else video.pause();
  }
  async function play(video) {
    if (video.error) return;
    try {
      await video.play();
    } catch (error) {
      if (error.name !== 'AbortError' && root.querySelector('video') === video && !video.error)
        setCaption('Press Play to start the recorded video.');
    }
  }
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      userPaused = true;
      syncPlayback();
    }
  });
  root.addEventListener(
    'toggle',
    (event) => {
      if (event.target.hasAttribute('data-restored-open')) {
        event.target.removeAttribute('data-restored-open');
        return;
      }
      if (event.target.tagName === 'DETAILS' && event.target.open) {
        userPaused = true;
        root.querySelector('video')?.pause();
      }
    },
    true,
  );
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-episode-retry')) {
      if (selectedId) {
        picker.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
        load(selectedId);
      } else init();
      return;
    }
    if (button.dataset.episode) {
      if (button.dataset.episode !== selectedId) load(button.dataset.episode);
      return;
    }
    if (!episode) return;
    if (button.hasAttribute('data-call')) {
      select(Number(button.dataset.call));
      return;
    }
    if (button.hasAttribute('data-prev')) {
      select(index - 1);
      return;
    }
    if (button.hasAttribute('data-next')) {
      select(index + 1);
      return;
    }
    const video = root.querySelector('video');
    if (button.hasAttribute('data-play')) {
      segmentEnd = null;
      userPaused = !video.paused;
      video.paused ? play(video) : video.pause();
    }
    if (button.hasAttribute('data-play-call')) {
      const call = episode.calls[index];
      userPaused = false;
      seekTo(call.video_start);
      segmentEnd = call.video_end - 0.015;
      play(video);
    }
    if (button.hasAttribute('data-icl-package')) {
      userPaused = true;
      video.pause();
    }
    if (button.hasAttribute('data-episode-camera')) setCamera(button.dataset.episodeCamera);
  });
  root.addEventListener('input', (event) => {
    if (event.target.hasAttribute('data-seek')) {
      segmentEnd = null;
      seekTo(Number(event.target.value));
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target.hasAttribute('data-speed')) {
      speed = Number(event.target.value);
      root.querySelector('video').playbackRate = speed;
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape')
      event.target.closest('[data-chapter]')?.setAttribute('data-tooltip-dismissed', 'true');
    const group = event.target.closest('.episode-picker, .episode-cameras');
    if (!group || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...group.querySelectorAll('button')];
    const position = buttons.indexOf(event.target);
    if (position < 0) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (position + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    buttons[next].click();
  });
  for (const event of ['pointerover', 'focusin'])
    root.addEventListener(event, (event) =>
      event.target.closest('[data-chapter]')?.removeAttribute('data-tooltip-dismissed'),
    );

  async function init() {
    content.setAttribute('aria-busy', 'true');
    content.innerHTML = '<p class="episode-state" role="status">Loading episode interactions…</p>';
    try {
      entries = await get('data/episodes/index.json');
      if (!entries.length) throw Error('No episodes');
      // Only the catalog initializes these buttons. Episode changes never replace them.
      picker.insertAdjacentHTML(
        'beforeend',
        entries
          .map(
            (entry) =>
              `<button type="button" data-episode="${escape(entry.id)}" aria-pressed="false">${escape(entry.title)}</button>`,
          )
          .join(''),
      );
      picker.hidden = false;
      await load(entries[0].id);
    } catch {
      content.setAttribute('aria-busy', 'false');
      content.innerHTML =
        '<div class="episode-state"><p role="alert">Episode data unavailable.</p><button type="button" data-episode-retry>Retry</button></div>';
    }
  }
  init();
})();
