// Drives ActiveFilters: what's narrowing the list, as pills that each take their filter off, and
// Clear all. Shown only while something is set. The page owns the filters: it listens, changes its
// state, and calls setActiveFilters() again.
//
//     import { setActiveFilters } from '@n1kname/components/activefilters.js';
//     setActiveFilters(bar, [{ key: 'where', label: 'Remote' }, { key: 'q', label: '"designer"' }]);
//     bar.addEventListener('filter-remove', (e) => drop(e.detail.key));
//     bar.addEventListener('filters-clear', () => dropAll());
//
// Removing a pill keeps keyboard focus in the bar: it lands on the pill that took the removed one's
// place, or on Clear all, or, with nothing left, on the element named by `data-return-focus`.
import { ICONS } from './icons';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const X = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.x}</svg>`;

export const setActiveFilters = (root, filters = []) => {
  const list = root.querySelector('[data-af-list]');
  if (!list) return;
  const remove = root.dataset.remove || 'Remove filter';
  const had = new Set([...list.querySelectorAll('.af-pill')].map((p) => p.dataset.key));
  list.innerHTML = filters
    .map((f) => `<li><button type="button" class="af-pill${had.has(f.key) ? '' : ' enter'}" data-key="${esc(f.key)}" aria-label="${esc(remove)}: ${esc(f.label)}"><span>${esc(f.label)}</span>${X}</button></li>`)
    .join('');
  root.hidden = filters.length === 0;
  // Put focus back where the person was, if they removed something with the keyboard.
  const at = root.dataset.focusAt;
  if (at === undefined) return;
  delete root.dataset.focusAt;
  const pills = list.querySelectorAll('.af-pill');
  const target = pills[Math.min(Number(at), pills.length - 1)] ?? (filters.length ? root.querySelector('[data-af-clear]') : document.getElementById(root.dataset.returnFocus ?? ''));
  target?.focus();
};

export const wireActiveFilters = (root) => {
  root.addEventListener('click', (e) => {
    const pill = e.target.closest('.af-pill');
    if (pill) {
      const pills = [...root.querySelectorAll('.af-pill')];
      if (pill === document.activeElement) root.dataset.focusAt = String(pills.indexOf(pill));
      root.dispatchEvent(new CustomEvent('filter-remove', { detail: { key: pill.dataset.key } }));
      return;
    }
    if (e.target.closest('[data-af-clear]')) {
      if (e.target.closest('[data-af-clear]') === document.activeElement) root.dataset.focusAt = '0';
      root.dispatchEvent(new CustomEvent('filters-clear'));
    }
  });
};
