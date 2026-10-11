(() => {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cursor = document.createElement('div');
  cursor.className = 'paper-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<svg viewBox="0 0 32 32" fill="none" shape-rendering="crispEdges"><path d="M2 6H8V7H14V8H20V9H26V10H30V16H26V18H22V20H18V22H14V26H10V22H6V18H4V14H2Z" fill="#e5e6e0" stroke="#30312e" stroke-width="2"/><path d="M4 8L28 15L10 20L14 24M10 20V25" stroke="#30312e" stroke-width="2"/><path d="M7 12L23 15L10 19Z" fill="#9fa19a"/></svg>';
  document.body.append(cursor);
  let previous = null, angle = 0, target = 0, frame = 0, lastTime = 0;
  const hide = () => { cursor.classList.remove('visible'); previous = null; };
  const updateMode = () => {
    document.documentElement.classList.toggle('plane-cursor', finePointer.matches);
    if (!finePointer.matches) hide();
  };
  function animate(now) {
    const dt = Math.min(now - lastTime || 16, 50); lastTime = now;
    const difference = ((target - angle + 540) % 360) - 180;
    angle += reducedMotion.matches ? difference : difference * (1 - Math.exp(-dt / 65));
    cursor.style.rotate = `${angle}deg`;
    if (Math.abs(difference) > 0.4 && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    else { angle = target; cursor.style.rotate = `${angle}deg`; frame = 0; }
  }
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch') return hide();
    const editing = event.target.closest('input, textarea, [contenteditable="true"]');
    cursor.classList.toggle('visible', !editing);
    cursor.style.left = `${event.clientX - 30}px`;
    cursor.style.top = `${event.clientY - 16}px`;
    if (previous) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      if (Math.hypot(dx, dy) >= 3) {
        target = (Math.round(Math.atan2(dy, dx) * 180 / Math.PI / 45) * 45 + 360) % 360;
        previous = {x: event.clientX, y: event.clientY};
        if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(animate); }
      }
    } else previous = {x: event.clientX, y: event.clientY};
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  finePointer.addEventListener('change', updateMode);
  updateMode();
})();
