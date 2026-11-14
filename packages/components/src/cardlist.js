// Drives CardList: one long card per item, with a score dial, fact chips and actions. The same
// markup at build time (CardList's `items`) and at runtime (setCards), so both look the same.
//
//     import { setCards, setCardState, removeCard } from '@n1kname/components/cardlist.js';
//     setCards(list, rooms.map((r) => ({
//       id: r.id, title: r.name, subtitle: r.floor, score: r.score,
//       chips: [{ icon: 'map-pin', label: 'Next to the hall', tone: 'good' }],
//       actions: [{ action: 'like', icon: 'heart', label: 'Favourite', pressed: r.liked }, { action: 'remove', icon: 'x', label: 'Remove' }],
//     })));
//     list.addEventListener('card-open', (e) => open(e.detail.id));
//     list.addEventListener('card-action', (e) => act(e.detail.id, e.detail.action, e.detail.button));
//
// An item: { id, title, subtitle?, href?, score?, scoreText?, chips?: [{ icon?, label, tone? }],
// actions?: [{ action, icon, label, pressed? }] }. Text is escaped; `href` makes the title a link,
// otherwise it's a button that fires `card-open`. The page sorts; the list keeps the order given.
import { ICONS } from './icons';
import { snapshot, flip } from './flip.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const svg = (name, size = 14, stroke = 2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The dial's tone from the list's thresholds: good from `good`, warning from `warning`. */
export const scoreTone = (score, { good = 7, warning = 5 } = {}) => (score === null || score === undefined ? 'none' : score >= good ? 'good' : score >= warning ? 'warning' : 'neutral');

export const dialHTML = (score, opts = {}) => {
  if (score === null || score === undefined) return `<span class="score-dial none" role="img" aria-label="Not scored yet"><span>–</span></span>`;
  const max = opts.max ?? 10;
  const text = opts.text ?? (Number.isInteger(score) ? String(score) : score.toFixed(1));
  return `<span class="score-dial ${scoreTone(score, opts)}" style="--p:${Math.max(0, Math.min(1, score / max))}" role="img" aria-label="Score ${esc(text)} out of ${max}"><span>${esc(text)}</span></span>`;
};

export const cardHTML = (item, opts = {}) => {
  const title = item.href
    ? `<a class="card-open" href="${esc(item.href)}">${esc(item.title)}</a>`
    : `<button type="button" class="card-open">${esc(item.title)}</button>`;
  const chips = (item.chips ?? []).map((c) => `<li class="fact-chip${c.tone === 'good' ? ' good' : ''}">${c.icon ? svg(c.icon) : ''}<span>${esc(c.label)}</span></li>`).join('');
  const actions = (item.actions ?? [])
    .map((a) => `<button type="button" class="icon-button" data-action="${esc(a.action)}" aria-label="${esc(a.label)}" title="${esc(a.label)}"${a.pressed === undefined ? '' : ` aria-pressed="${a.pressed}"`}>${svg(a.icon, 18, 1.75)}</button>`)
    .join('');
  return (
    `<li class="card-item" data-key="${esc(item.id)}"><article class="card">` +
    `<div class="card-lead">${item.lead ?? dialHTML(item.score, { ...opts, text: item.scoreText })}</div>` +
    `<div class="card-head"><h${opts.level ?? 3} class="card-title">${title}</h${opts.level ?? 3}>${item.subtitle ? `<p class="card-sub">${esc(item.subtitle)}</p>` : ''}</div>` +
    (chips ? `<ul class="card-chips">${chips}</ul>` : '') +
    (actions ? `<div class="card-actions">${actions}</div>` : '') +
    `</article></li>`
  );
};

export const placeholdersHTML = (n) =>
  Array.from({ length: n }, () => `<li class="card-item placeholder" aria-hidden="true"><div class="card"><div class="card-lead"><span class="score-dial none"></span></div><div class="card-head"><span class="bar wide"></span><span class="bar"></span></div><ul class="card-chips"><li class="bar chip"></li><li class="bar chip"></li></ul></div></li>`).join('');

const opts = (root) => ({ good: Number(root.dataset.good ?? 7), warning: Number(root.dataset.warning ?? 5), max: Number(root.dataset.max ?? 10), level: Number(root.dataset.level ?? 3) });
const wrapOf = (root) => root.closest('.card-list-wrap');

/** 'loading' shows placeholder cards (after 300ms), 'empty' and 'failed' their slots, 'ready' the cards. */
export const setCardState = (root, state, { cards = 4 } = {}) => {
  if (state === 'loading') {
    root.innerHTML = placeholdersHTML(cards);
    root.setAttribute('aria-busy', 'true');
  } else root.removeAttribute('aria-busy');
  const wrap = wrapOf(root);
  if (wrap) wrap.dataset.state = state;
};

/** Fills the list. The first fill after loading rises in, staggered; later fills glide (flip). */
export const setCards = (root, items) => {
  const first = !root.dataset.filled;
  const before = first ? null : snapshot(root);
  root.innerHTML = items.map((i) => cardHTML(i, opts(root))).join('');
  root.removeAttribute('aria-busy');
  const wrap = wrapOf(root);
  if (wrap) wrap.dataset.state = items.length === 0 && wrap.querySelector('[data-state-for="empty"]') ? 'empty' : 'ready';
  if (first) {
    root.dataset.filled = '';
    if (!reduced()) [...root.children].slice(0, 12).forEach((li, i) => { li.style.setProperty('--i', i); li.classList.add('enter'); });
  } else flip(root, before);
};

/** Slides a card out, then closes the gap. Resolves when it's gone. */
export const removeCard = (root, id) =>
  new Promise((done) => {
    const li = [...root.children].find((x) => x.dataset.key === String(id));
    if (!li) return done();
    const go = () => {
      const before = snapshot(root);
      li.remove();
      flip(root, before);
      done();
    };
    if (reduced()) return go();
    li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 180, easing: 'ease-in' }).finished.then(go, go);
  });

export const wireCards = (root) => {
  root.addEventListener('click', (e) => {
    const li = e.target.closest('.card-item');
    if (!li || li.classList.contains('placeholder')) return;
    const button = e.target.closest('[data-action]');
    if (button) {
      // The heart pops as it turns on; the page owns the state and sets aria-pressed.
      if (button.getAttribute('aria-pressed') === 'false' && !reduced()) button.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      root.dispatchEvent(new CustomEvent('card-action', { detail: { id: li.dataset.key, action: button.dataset.action, button } }));
      return;
    }
    const open = e.target.closest('.card-open');
    if (open?.tagName === 'A') return;
    // A click anywhere on the card opens it, unless someone is selecting its text.
    if (!open && getSelection()?.toString()) return;
    root.dispatchEvent(new CustomEvent('card-open', { detail: { id: li.dataset.key } }));
  });
};
