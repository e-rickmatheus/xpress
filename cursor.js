(() => {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cursor = document.createElement('div');
  cursor.className = 'paper-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<svg viewBox="0 0 48 40" fill="none"><path d="M4 6L44 20L6 34L12 21Z" fill="#f7f7f2" stroke="#252621" stroke-width="2" stroke-linejoin="round"/><path d="M12 21L44 20L19 27L16 34Z" fill="#b5b7af" stroke="#252621" stroke-width="2" stroke-linejoin="round"/><path d="M4 6L12 21L44 20M12 21L19 27" stroke="#252621" stroke-width="1.5" stroke-linejoin="round"/></svg>';
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
    angle += reducedMotion.matches ? difference : difference * (1 - Math.exp(-dt / 90));
    cursor.style.rotate = `${angle}deg`;
    if (Math.abs(difference) > 0.4 && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    else { angle = target; cursor.style.rotate = `${angle}deg`; frame = 0; }
  }
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch') return hide();
    const editing = event.target.closest('input, textarea, [contenteditable="true"]');
    cursor.classList.toggle('visible', !editing);
    cursor.style.left = `${event.clientX - 33}px`;
    cursor.style.top = `${event.clientY - 15}px`;
    if (previous) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      if (Math.hypot(dx, dy) >= 3) {
        target = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
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
