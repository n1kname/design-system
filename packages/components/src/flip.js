// A list or table that changes in place, as under a search or a filter. Rows that stay glide from
// where they were to where they are, on the spring; rows that arrive fade up a little; rows that go
// simply go. Only rows in view move, so a list of hundreds stays quick. Rows are known by
// data-key. Nothing moves under reduced motion.
//
//     import { snapshot, flip } from '@n1kname/components/flip.js';
//     const before = snapshot(tbody);
//     tbody.innerHTML = rows.map(...).join('');   // each <tr data-key="…">
//     flip(tbody, before);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const ms = (name, fallback) => {
  const v = token(name, '');
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : v.endsWith('ms') ? n : n * 1000;
};

export const snapshot = (list) => {
  const at = new Map();
  for (const row of list.querySelectorAll('[data-key]')) at.set(row.dataset.key, row.getBoundingClientRect().top);
  return at;
};

export const flip = (list, before) => {
  if (reduced() || !before) return;
  const view = innerHeight;
  const spring = { duration: ms('--motion-spring', 340), easing: token('--ease-spring', 'ease-out') };
  const fade = { duration: ms('--motion-base', 180), easing: token('--ease-out', 'ease-out') };
  for (const row of list.querySelectorAll('[data-key]')) {
    const top = row.getBoundingClientRect().top;
    if (top > view + 40 || top < -200) continue;
    const was = before.get(row.dataset.key);
    if (was === undefined) row.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], fade);
    else if (Math.abs(was - top) > 1 && Math.abs(was - top) < view) row.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], spring);
  }
};
