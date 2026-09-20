// Crop all camera tiles from one decoded frame, retaining the original player clock.
const recordingMultiview = new WeakMap();
function initRecordingMultiview(video, cameraOrder) {
  const viewport = video.closest('.media-viewport');
  if (!viewport || recordingMultiview.has(video)) return;
  const tiles = document.createElement('div');
  tiles.className = 'recording-multiview';
  tiles.innerHTML = ['Overview', 'Left wrist', 'Right wrist']
    .map(
      (label, i) =>
        `<figure><canvas data-recording-camera="${cameraOrder[i]}" role="img" aria-label="${label} camera"></canvas><figcaption>${label}</figcaption></figure>`,
    )
    .join('');
  const controls = document.createElement('div');
  controls.className = 'recording-playback';
  controls.innerHTML =
    '<button type="button" data-recording-play>Play</button><input type="range" min="0" max="0" value="0" step="0.05" aria-label="Video position"><output></output>';
  viewport.append(tiles, controls);
  const canvases = [...tiles.querySelectorAll('canvas')],
    play = controls.querySelector('button'),
    seek = controls.querySelector('input'),
    output = controls.querySelector('output');
  let frame = null,
    enabled = false;
  const frameCallback = typeof video.requestVideoFrameCallback === 'function';
  const time = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function update() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    seek.max = duration;
    seek.value = video.currentTime;
    output.textContent = `${time(video.currentTime)} / ${time(duration)}`;
    play.textContent = video.paused ? 'Play' : 'Pause';
    play.setAttribute('aria-label', video.paused ? 'Play recording' : 'Pause recording');
  }
  function draw() {
    if (!enabled || !video.isConnected || video.readyState < 2) return;
    const width = video.videoWidth / 3,
      height = video.videoHeight;
    for (const canvas of canvases) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      canvas
        .getContext('2d')
        .drawImage(
          video,
          Number(canvas.dataset.recordingCamera) * width,
          0,
          width,
          height,
          0,
          0,
          width,
          height,
        );
    }
  }
  function cancel() {
    if (frame === null) return;
    if (frameCallback) video.cancelVideoFrameCallback(frame);
    else cancelAnimationFrame(frame);
    frame = null;
  }
  function tick() {
    frame = null;
    if (!enabled || !video.isConnected) return;
    draw();
    if (!video.paused && !video.ended) schedule();
  }
  function schedule() {
    if (frame !== null || !enabled || !video.isConnected || video.paused) return;
    frame = frameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  }
  play.addEventListener('click', async () => {
    if (video.paused) {
      try {
        await video.play();
      } catch {
        update();
      }
    } else video.pause();
  });
  seek.addEventListener('input', () => {
    video.currentTime = Number(seek.value);
    update();
  });
  video.addEventListener('play', () => {
    update();
    schedule();
  });
  for (const event of ['pause', 'ended'])
    video.addEventListener(event, () => {
      cancel();
      draw();
      update();
    });
  for (const event of ['loadeddata', 'seeked', 'durationchange'])
    video.addEventListener(event, () => {
      draw();
      update();
    });
  video.addEventListener('timeupdate', update);
  recordingMultiview.set(video, (all) => {
    enabled = all;
    if (all) {
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
    } else {
      video.removeAttribute('aria-hidden');
      video.removeAttribute('tabindex');
    }
    viewport.classList.toggle('recording-all-views', all);
    cancel();
    update();
    if (all) {
      draw();
      schedule();
    }
  });
  update();
}
