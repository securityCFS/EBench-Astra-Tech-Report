/* A single, scroll-morphed particle field spans the complete report. */
(() => {
  const canvas = document.getElementById('ambient-particles');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const count = 3300,
    tau = Math.PI * 2;
  let seed = 817,
    w = 0,
    h = 0,
    raf = 0,
    last = 0,
    time = 0,
    phase = 0,
    targetPhase = 0,
    stops = [];
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const smooth = (v) => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // Blossom silhouette from https://openai.com/favicon.svg, without its disc.
  const blossom = new Path2D(
    'M75.91 73.628V62.232c0-.96.36-1.68 1.199-2.16l22.912-13.194c3.119-1.8 6.838-2.639 10.676-2.639 14.394 0 23.511 11.157 23.511 23.032 0 .839 0 1.799-.12 2.758l-23.752-13.914c-1.439-.84-2.879-.84-4.318 0L75.91 73.627Zm53.499 44.383v-27.23c0-1.68-.72-2.88-2.159-3.719L97.142 69.55l9.836-5.638c.839-.48 1.559-.48 2.399 0l22.912 13.195c6.598 3.839 11.035 11.995 11.035 19.912 0 9.116-5.397 17.513-13.915 20.992v.001Zm-60.577-23.99-9.836-5.758c-.84-.48-1.2-1.2-1.2-2.16v-26.39c0-12.834 9.837-22.55 23.152-22.55 5.039 0 9.716 1.679 13.676 4.678L70.993 55.516c-1.44.84-2.16 2.039-2.16 3.719v34.787-.002Zm21.173 12.234L75.91 98.339V81.546l14.095-7.917 14.094 7.917v16.793l-14.094 7.916Zm9.056 36.467c-5.038 0-9.716-1.68-13.675-4.678l23.631-13.676c1.439-.839 2.159-2.038 2.159-3.718V85.863l9.956 5.757c.84.48 1.2 1.2 1.2 2.16v26.389c0 12.835-9.957 22.552-23.27 22.552v.001Zm-28.43-26.75L47.72 102.778c-6.599-3.84-11.036-11.996-11.036-19.913 0-9.236 5.518-17.513 14.034-20.992v27.35c0 1.68.72 2.879 2.16 3.718l29.989 17.393-9.837 5.638c-.84.48-1.56.48-2.399 0Zm-1.318 19.673c-13.555 0-23.512-10.196-23.512-22.792 0-.959.12-1.919.24-2.879l23.63 13.675c1.44.84 2.88.84 4.32 0l30.108-17.392v11.395c0 .96-.361 1.68-1.2 2.16l-22.912 13.194c-3.119 1.8-6.837 2.639-10.675 2.639Zm29.748 14.274c14.515 0 26.63-10.316 29.39-23.991 13.434-3.479 22.071-16.074 22.071-28.91 0-8.396-3.598-16.553-10.076-22.43.6-2.52.96-5.039.96-7.557 0-17.153-13.915-29.99-29.989-29.99-3.239 0-6.358.48-9.477 1.56-5.398-5.278-12.835-8.637-20.992-8.637-14.515 0-26.63 10.316-29.39 23.991-13.434 3.48-22.07 16.074-22.07 28.91 0 8.396 3.598 16.553 10.075 22.431-.6 2.519-.96 5.038-.96 7.556 0 17.154 13.915 29.989 29.99 29.989 3.238 0 6.357-.479 9.476-1.559 5.397 5.278 12.835 8.637 20.992 8.637Z',
  );
  const robot = new Path2D();
  // Rounded head, shoulder joints, paired arms, torso and legs.
  robot.roundRect(64, 21, 52, 36, 12);
  robot.roundRect(80, 56, 20, 10, 4);
  robot.roundRect(58, 67, 64, 57, 13);
  robot.roundRect(37, 68, 15, 44, 7);
  robot.roundRect(29, 103, 18, 31, 8);
  robot.roundRect(128, 68, 15, 44, 7);
  robot.roundRect(133, 103, 18, 31, 8);
  robot.roundRect(65, 127, 20, 28, 6);
  robot.roundRect(95, 127, 20, 28, 6);
  robot.roundRect(57, 151, 29, 12, 5);
  robot.roundRect(94, 151, 29, 12, 5);
  const robotCutout = new Path2D();
  robotCutout.roundRect(76, 32, 28, 12, 5);
  robotCutout.roundRect(72, 81, 36, 25, 7);

  function samples(path, cutout, scale) {
    const points = [];
    while (points.length < count) {
      const x = random() * 180,
        y = random() * 180;
      if (ctx.isPointInPath(path, x, y) && (!cutout || !ctx.isPointInPath(cutout, x, y)))
        points.push({ x: (x - 90) / scale, y: (y - 90) / scale });
    }
    return points.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  }
  const logo = samples(blossom, null, 62),
    machine = samples(robot, robotCutout, 75);
  const galaxy = Array.from({ length: count }, () => {
    if (random() < 0.28) {
      const r = Math.min(0.3, 0.11 * Math.sqrt(-2 * Math.log(Math.max(random(), 0.00001)))),
        a = random() * tau;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.78 };
    }
    const r = 0.09 + Math.pow(random(), 0.72) * 0.91,
      arm = (Math.floor(random() * 4) * tau) / 4;
    const a = arm + r * 5.2 + (random() - 0.5) * (0.2 + r * 0.55);
    return { x: Math.cos(a) * r * 1.16, y: Math.sin(a) * r * 0.8 };
  }).sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  const shapes = { galaxy, gpt: logo, robot: machine };
  const sequence = ['galaxy', 'gpt', 'robot', 'galaxy', 'gpt', 'robot', 'galaxy', 'gpt', 'robot'];
  const points = galaxy.map((g, i) => ({
    index: i,
    size: random() > 0.965 ? 2 + random() * 0.65 : 0.4 + Math.pow(random(), 1.7) * 1.25,
    phase: random() * tau,
    color: random() > 0.94 ? '159,125,84' : random() > 0.45 ? '67,110,184' : '91,126,190',
    alpha: 0.24 + random() * 0.28,
  }));
  const halos = new Map();
  for (const color of new Set(points.map((p) => p.color))) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    const glow = sprite.getContext('2d'),
      gradient = glow.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, `rgba(${color},.5)`);
    gradient.addColorStop(0.22, `rgba(${color},.22)`);
    gradient.addColorStop(0.55, `rgba(${color},.06)`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    glow.fillStyle = gradient;
    glow.fillRect(0, 0, 48, 48);
    halos.set(color, sprite);
  }
  const stars = Array.from({ length: 210 }, () => ({
    x: random(),
    y: random(),
    size: 0.45 + random() * 1.05,
    phase: random() * tau,
  }));
  function measure() {
    const header = document.querySelector('.header').getBoundingClientRect().height;
    const top = (id) =>
      Math.max(
        0,
        document.getElementById(id).getBoundingClientRect().top + window.scrollY - header,
      );
    // Repeat the three approved motifs across the report chapters.
    stops = [
      0,
      top('overall'),
      top('findings'),
      top('limits'),
      top('safety'),
      top('case-adapt'),
      top('case-poc'),
      top('conclusion'),
      top('references'),
    ];
    for (let i = 1; i < stops.length; i++) stops[i] = Math.max(stops[i], stops[i - 1] + 1);
    progress();
  }
  function progress() {
    const scroll = window.scrollY;
    let i = 0;
    while (i < stops.length - 1 && scroll >= stops[i + 1]) i++;
    if (i === stops.length - 1) targetPhase = i;
    else {
      const fraction = (scroll - stops[i]) / (stops[i + 1] - stops[i]);
      // Each shape settles briefly before a continuous transition to the next.
      targetPhase = i + smooth((fraction - (i === 0 ? 0 : 0.42)) / (i === 0 ? 1 : 0.58));
    }
    if (reduced.matches) {
      phase = targetPhase;
      render();
    }
  }
  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    render();
  }
  function dot(x, y, r, color, alpha) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${color},${alpha})`;
    ctx.arc(x, y, r, 0, tau);
    ctx.fill();
  }
  function render() {
    ctx.clearRect(0, 0, w, h);
    const radius = Math.min(390, h * 0.47, w * 0.36),
      cx = w * 0.76 + Math.sin(time * 0.08) * 9,
      cy = h * 0.56 + Math.cos(time * 0.07) * 7;
    const step = Math.min(Math.floor(phase), sequence.length - 1),
      mix = phase - step;
    const fromName = sequence[step],
      toName = sequence[Math.min(step + 1, sequence.length - 1)];
    const from = shapes[fromName],
      to = shapes[toName];
    const rotation = (name) => (name === 'galaxy' ? time * 0.013 - 0.22 : 0);
    const a = rotation(fromName),
      b = rotation(toName),
      ca = Math.cos(a),
      sa = Math.sin(a),
      cb = Math.cos(b),
      sb = Math.sin(b);
    for (const s of stars) {
      dot(
        (s.x * w + time * 1.2) % (w + 4),
        s.y * h + Math.sin(time * 0.1 + s.phase) * 4,
        s.size,
        '85,122,181',
        0.17,
      );
    }
    const galaxyWeight = (fromName === 'galaxy' ? 1 - mix : 0) + (toName === 'galaxy' ? mix : 0);
    if (galaxyWeight > 0) {
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.25);
      core.addColorStop(0, `rgba(255,255,255,${0.8 * galaxyWeight})`);
      core.addColorStop(0.15, `rgba(236,247,255,${0.64 * galaxyWeight})`);
      core.addColorStop(0.42, `rgba(130,171,226,${0.22 * galaxyWeight})`);
      core.addColorStop(1, 'rgba(130,171,226,0)');
      ctx.fillStyle = core;
      ctx.fillRect(cx - radius * 0.25, cy - radius * 0.25, radius * 0.5, radius * 0.5);
    }
    for (const p of points) {
      const f = from[p.index],
        t = to[p.index];
      const x = lerp(f.x * ca - f.y * sa, t.x * cb - t.y * sb, mix),
        y = lerp(f.x * sa + f.y * ca, t.x * sb + t.y * cb, mix);
      const dx = Math.sin(time * 0.24 + p.phase) * 1.6,
        dy = Math.cos(time * 0.2 + p.phase) * 1.6;
      const px = cx + x * radius + dx,
        py = cy + y * radius + dy,
        alpha = p.alpha * 0.82 * (0.82 + 0.18 * Math.sin(time * 0.45 + p.phase));
      if (p.size > 1.55) {
        const diameter = p.size * 11;
        ctx.globalAlpha = alpha;
        ctx.drawImage(halos.get(p.color), px - diameter / 2, py - diameter / 2, diameter, diameter);
        ctx.globalAlpha = 1;
      }
      dot(px, py, p.size, p.color, alpha);
      if (p.size > 2) dot(px, py, p.size * 0.2, '240,248,255', 0.53);
    }
    canvas.dataset.scene = mix < 0.02 ? fromName : mix > 0.98 ? toName : fromName + '-to-' + toName;
  }
  function frame(now) {
    raf = 0;
    if (document.hidden || reduced.matches) return;
    if (now - last >= 1000 / 30) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 7);
      phase = lerp(phase, targetPhase, ease);
      render();
    }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!document.hidden && !reduced.matches) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else {
      phase = targetPhase;
      render();
    }
  }
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  new ResizeObserver(measure).observe(document.querySelector('main'));
  resize();
  phase = targetPhase;
  sync();
})();
