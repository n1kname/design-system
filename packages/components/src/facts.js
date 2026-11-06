// Drives Facts: fills one from script (setFacts) and plays its two options once, as it comes into
// view: the highlighter under a tile's figure, and icons that draw themselves in. Both are off
// unless the Facts asks for them.
import { ICONS } from './icons';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icon = (name, size) =>
  name && ICONS[name]
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${size < 20 ? 1.75 : 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
    : '';

// items: [{ label, value, icon?, accent? }], in the order they read.
export const setFacts = (dl, items) => {
  const size = dl.dataset.variant === 'tiles' ? 16 : 14;
  const hl = dl.hasAttribute('data-highlight') && dl.dataset.variant === 'tiles';
  dl.innerHTML = items
    .map(
      (f, n) =>
        `<div style="--n:${n}${f.accent ? `;--accent:${f.accent}` : ''}"><dt>${f.icon ? `<span class="fact-icon">${icon(f.icon, size)}</span>` : ''}${esc(f.label)}</dt>` +
        `<dd>${hl ? `<mark class="highlight">${esc(f.value)}</mark>` : esc(f.value)}</dd></div>`,
    )
    .join('');
  arrive(dl);
};

const seen = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), seen.unobserve(e.target))), { threshold: 0.4 });

// Once, as it comes into view; again after setFacts.
export const arrive = (dl) => {
  dl.classList.remove('in');
  if (seen) seen.observe(dl);
  else dl.classList.add('in');
};
