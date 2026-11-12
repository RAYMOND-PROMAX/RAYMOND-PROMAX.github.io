(() => {
  const config = {
    count: 30,
    maxParticles: 240,
    colors: ['#2dd4bf', '#ffd166', '#ff7096', '#9b8cff', '#70d6ff'],
    speed: [45, 125],
    lifetime: [600, 1000],
    radius: [1.2, 2.4],
    gravity: 110,
    drag: 1.8,
    tapDistance: 10,
    tapDuration: 600
  };
  window.disposeClickFireworks?.();
  const canvas = document.createElement('canvas');
  canvas.id = 'click-fireworks';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Click fireworks: Canvas 2D is unavailable.');
    return;
  }
  document.body.append(canvas);
  const events = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let particles = [], gesture = null, frame = 0, previous = 0;
  let width = 0, height = 0, ratio = 0;
  const random = ([min, max]) => min + Math.random() * (max - min);
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    particles = [];
    gesture = null;
    ctx.clearRect(0, 0, width, height);
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    ratio = devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function draw(now) {
    frame = 0;
    if (document.hidden || motion.matches) { clear(); return; }
    if (ratio !== (devicePixelRatio || 1)) resize();
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      p.vx *= Math.exp(-config.drag * dt);
      p.vy = p.vy * Math.exp(-config.drag * dt) + config.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - (now - p.born) / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (particles.length) frame = requestAnimationFrame(draw);
  }
  function burst(x, y) {
    if (motion.matches || document.hidden) return;
    if (ratio !== (devicePixelRatio || 1)) resize();
    const now = performance.now();
    const count = Math.min(config.count, config.maxParticles);
    const keep = config.maxParticles - count;
    particles = keep > 0 ? particles.slice(-keep) : [];
    for (let i = 0; i < count; i++) {
      const angle = (i + Math.random()) / count * Math.PI * 2;
      const speed = random(config.speed);
      particles.push({x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: random(config.radius), color: config.colors[i % config.colors.length],
        born: now, life: random(config.lifetime)});
    }
    if (!frame) { previous = now; frame = requestAnimationFrame(draw); }
  }
  const listen = (target, type, handler) => target.addEventListener(type, handler,
    {passive: true, capture: true, signal: events.signal});
  listen(document, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) { gesture = null; return; }
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now()};
  });
  listen(document, 'pointermove', event => {
    if (gesture && event.pointerId === gesture.id &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > config.tapDistance) gesture = null;
  });
  listen(document, 'pointerup', event => {
    const start = gesture;
    gesture = null;
    if (start && event.pointerId === start.id && performance.now() - start.time <= config.tapDuration &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= config.tapDistance) {
      burst(event.clientX, event.clientY);
    }
  });
  listen(document, 'pointercancel', () => { gesture = null; });
  listen(document, 'scroll', () => { gesture = null; });
  listen(window, 'blur', clear);
  listen(window, 'resize', resize);
  listen(document, 'visibilitychange', () => { if (document.hidden) clear(); });
  listen(motion, 'change', clear);
  // Keep the single listener set on bfcache restores; dispose on script reinitialization.
  listen(window, 'pagehide', clear);
  listen(window, 'pageshow', resize);
  window.disposeClickFireworks = () => {
    clear();
    events.abort();
    canvas.remove();
    delete window.disposeClickFireworks;
  };
  resize();
})();
