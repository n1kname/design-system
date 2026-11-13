// Drives Segmented: the marker slides to the chosen option on the spring, and `segment-change`
// fires with its value. setSegmented(root, value) chooses one from code, or none with null (the
// marker fades out), without firing the event.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const ms = (name, fallback) => {
  const v = token(name, '');
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : v.endsWith('ms') ? n : n * 1000;
};

export const wireSegmented = (root) => {
  const marker = root.querySelector('.marker');
  const place = (animate) => {
    const on = root.querySelector('[aria-pressed="true"]');
    marker.style.opacity = on ? '1' : '0';
    if (!on) return;
    const r = root.getBoundingClientRect();
    const b = on.getBoundingClientRect();
    marker.style.transition = animate && !reduced() ? `transform ${ms('--motion-spring', 340)}ms ${token('--ease-spring', 'ease-out')}, width ${ms('--motion-base', 180)}ms ${token('--ease-out', 'ease-out')}` : 'none';
    marker.style.width = `${b.width}px`;
    marker.style.transform = `translateX(${b.left - r.left - root.clientLeft - 3}px)`;
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    root.querySelectorAll('button[data-value]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    place(true);
    root.dispatchEvent(new CustomEvent('segment-change', { detail: { value: b.dataset.value } }));
  });
  new ResizeObserver(() => place(false)).observe(root);
  root._place = place;
  place(false);
};

export const setSegmented = (root, value) => {
  const was = root.querySelector('[aria-pressed="true"]');
  root.querySelectorAll('button[data-value]').forEach((x) => x.setAttribute('aria-pressed', String(value !== null && x.dataset.value === value)));
  // From nothing chosen, the marker appears in place rather than sliding in from the left.
  root._place?.(Boolean(was));
};
