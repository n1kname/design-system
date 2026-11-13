// Drives FilterChips: one value of several, each with a swatch and a count. A second press on the
// chosen one goes back to All. Fires `chips-change` with the value ("all" for All).
//
//     import { setChips } from '@n1kname/components/chips.js';
//     setChips(chips, [{ value: 'cycling', label: 'Cycling', color: 'var(--c-chart-3)', icon: 'bike', count: 312 }, …], 'all');
//     chips.addEventListener('chips-change', (e) => show(e.detail.value));
//
// Call setChips again with new counts (say, under a search): with the same values it only
// updates the counts and states, so focus stays where it is. A value with nothing is disabled
// unless it is the one chosen.
import { ICONS } from './icons';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const button = (o, selected) =>
  `<button type="button" data-value="${esc(o.value)}" aria-pressed="${selected === o.value}"${o.count === 0 && selected !== o.value ? ' disabled' : ''} style="--chip:${o.color ?? 'var(--c-accent)'}">` +
  `${o.icon ? `<svg class="chip-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[o.icon] ?? ''}</svg>` : o.color ? `<i class="chip-swatch" style="background:${o.color}"></i>` : ''}${esc(o.label)}${o.count === undefined ? '' : ` <span class="n">${o.count}</span>`}</button>`;

export const setChips = (root, options, selected = 'all') => {
  const all = root.dataset.all;
  const list = all ? [{ value: 'all', label: all, count: options.every((o) => o.count !== undefined) ? options.reduce((s, o) => s + o.count, 0) : undefined }, ...options] : options;
  const now = [...root.querySelectorAll('button[data-value]')].map((b) => b.dataset.value);
  if (now.join('|') === list.map((o) => o.value).join('|')) {
    // The first counts after a load land without the fade, so chips don't seem to switch on.
    if (!root.dataset.counted) {
      root.dataset.counted = '';
      root.classList.add('settling');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('settling')));
    }
    root.querySelectorAll('button[data-value]').forEach((b, i) => {
      const o = list[i];
      const n = b.querySelector('.n');
      if (n && o.count !== undefined) n.textContent = String(o.count);
      b.disabled = o.count === 0 && selected !== o.value;
      b.setAttribute('aria-pressed', String(o.value === selected));
    });
    return;
  }
  root.innerHTML = list.map((o) => button(o, selected)).join('');
};

export const wireChips = (root) => {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (!b || b.disabled) return;
    const now = root.querySelector('[aria-pressed="true"]')?.dataset.value;
    const value = now === b.dataset.value && root.dataset.all ? 'all' : b.dataset.value;
    root.querySelectorAll('button[data-value]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.value === value)));
    root.dispatchEvent(new CustomEvent('chips-change', { detail: { value } }));
  });
};
