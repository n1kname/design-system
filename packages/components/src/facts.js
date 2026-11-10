// Drives Facts: draws the facts (factsHTML, also used by Facts.astro at build time), fills them from
// script (setFacts, setFact) and plays its two options once, as it comes into view: the highlighter
// under a tile's figure, and icons that draw themselves in. Both are off unless the Facts asks.
//
// A fact: { label, value?, unit?, context?, delta?, icon?, accent?, key?, valueId?, contextId? }.
//   unit     small, after the figure: '638' + 'm³'.
//   context  the line under a tile's figure: 'against 699 in 2025'.
//   delta    a change, bold at the start of that line: { text: '−8.7%', tone: 'good' | 'bad' | 'neutral' },
//            or a string for neutral. Tiles only, like context.
//   key      names a fact for setFact(); valueId and contextId put ids on the figure and the line,
//            for a page that writes them itself, as with Stat.
import { settle } from '@n1kname/charts/update';
import { ICONS } from './icons';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = (name, size) =>
  name && ICONS[name]
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${size < 20 ? 1.75 : 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
    : '';

export const PLACEHOLDER = '–';
const TONES = ['good', 'bad', 'neutral'];
// Unknown is a dash, never 0 and never a unit on its own.
const known = (v) => v != null && v !== '' && v !== '–' && v !== '—';
const deltaOf = (d) => (d == null || d === '' ? null : typeof d === 'string' ? { text: d, tone: 'neutral' } : { text: d.text, tone: TONES.includes(d.tone) ? d.tone : 'neutral' });
const hasLine = (f) => f.context != null || f.contextId != null || deltaOf(f.delta) != null;
const sizeOf = (variant) => (variant === 'tiles' ? 16 : 14);

const dtHTML = (f, size) => `${f.icon ? `<span class="fact-icon">${icon(f.icon, size)}</span>` : ''}${esc(f.label)}`;
const lineHTML = (f) => {
  const d = deltaOf(f.delta);
  return `${d ? `<strong class="fact-delta" data-tone="${d.tone}">${esc(d.text)}</strong> ` : ''}${esc(f.context)}`;
};

/** The facts inside a Facts' <dl>, and the attributes the <dl> needs for them. */
export const factsHTML = (items = [], { variant = 'tiles', highlight = false } = {}) => {
  const size = sizeOf(variant);
  const tiles = variant === 'tiles';
  const hl = highlight && tiles;
  const html = items
    .map((f, n) => {
      const value = known(f.value) ? f.value : PLACEHOLDER;
      const figure = hl ? `<mark class="highlight">${esc(value)}</mark>` : esc(value);
      return (
        `<div style="--n:${n}${f.accent ? `;--accent:${esc(f.accent)}` : ''}"${f.key != null ? ` data-key="${esc(f.key)}"` : ''}${f.icon ? ` data-icon="${esc(f.icon)}"` : ''}>` +
        `<dt>${dtHTML(f, size)}</dt>` +
        `<dd class="fact-value"><span class="fact-figure"${f.valueId ? ` id="${esc(f.valueId)}"` : ''}>${figure}</span><span class="fact-unit" data-unit="${esc(f.unit)}">${known(f.value) ? esc(f.unit) : ''}</span></dd>` +
        (tiles ? `<dd class="fact-context"${f.contextId ? ` id="${esc(f.contextId)}"` : ''}>${lineHTML(f)}</dd>` : '') +
        `</div>`
      );
    })
    .join('');
  return { html, count: countOf(items.length), context: tiles && items.some(hasLine) };
};

// The tile strip balances its rows by how many there are; past six it simply fills.
const countOf = (n) => (n > 6 ? 'many' : String(n));

const mark = (dl, count, context) => {
  dl.dataset.count = count;
  if (context) dl.dataset.context = '';
};

/**
 * Writes one fact's fields into its tile. Fields left out stay as they are, so setFact can change
 * just the figure; setFacts passes every field.
 */
const apply = (dl, div, f, all) => {
  const size = sizeOf(dl.dataset.variant);
  const has = (k) => all || k in f;
  if (has('label') || has('icon')) {
    const dt = div.querySelector('dt');
    const label = has('label') ? f.label : dt.textContent;
    const name = has('icon') ? f.icon : div.dataset.icon;
    // Only when it changes, so icons that drew themselves in don't draw again.
    if (dt.textContent !== String(label ?? '') || (div.dataset.icon ?? '') !== (name ?? '')) {
      dt.innerHTML = dtHTML({ label, icon: name }, size);
      if (name) div.dataset.icon = name;
      else delete div.dataset.icon;
    }
  }
  if (has('accent')) {
    if (f.accent) div.style.setProperty('--accent', f.accent);
    else div.style.removeProperty('--accent');
  }
  if (has('key')) {
    if (f.key != null) div.dataset.key = f.key;
    else delete div.dataset.key;
  }
  const fig = div.querySelector('.fact-figure');
  const unit = div.querySelector('.fact-unit');
  if (has('value')) {
    const target = fig.querySelector('mark') ?? fig;
    const value = known(f.value) ? String(f.value) : PLACEHOLDER;
    const before = target.textContent;
    if (before !== value) {
      target.textContent = value;
      // A figure that changes settles in, on a page that asks for update motion, as charts do.
      if (known(before) && dl.closest('[data-chart-motion="update"]')) settle(fig.parentElement);
    }
  }
  if (has('value') || has('unit')) {
    const value = has('value') ? f.value : fig.textContent;
    const u = has('unit') ? f.unit : unit.dataset.unit;
    unit.dataset.unit = u ?? '';
    unit.textContent = known(value) && u ? u : '';
  }
  const line = div.querySelector('.fact-context');
  if (line && (has('context') || has('delta'))) {
    const d = has('delta') ? f.delta : line.querySelector('.fact-delta') && { text: line.querySelector('.fact-delta').textContent, tone: line.querySelector('.fact-delta').dataset.tone };
    const c = has('context') ? f.context : [...line.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    line.innerHTML = lineHTML({ context: c, delta: d });
    if (hasLine({ context: c || undefined, delta: d })) dl.dataset.context = '';
  }
};

const tilesOf = (dl) => [...dl.children].filter((el) => el.tagName === 'DIV');

/**
 * Fills a Facts from script. items: facts in the order they read. With as many facts as it has, it
 * changes them in place, so a figure that changes can settle and nothing redraws; otherwise it draws
 * them again and plays the options once more.
 */
export const setFacts = (dl, items) => {
  const tiles = tilesOf(dl);
  if (tiles.length === items.length && tiles.length) {
    items.forEach((f, i) => apply(dl, tiles[i], f, true));
    // Every line gone: the strip drops the row it kept for them.
    if (dl.dataset.variant === 'tiles' && !items.some(hasLine)) delete dl.dataset.context;
    return;
  }
  const { html, count, context } = factsHTML(items, { variant: dl.dataset.variant, highlight: dl.hasAttribute('data-highlight') });
  dl.innerHTML = html;
  delete dl.dataset.context;
  mark(dl, count, context);
  arrive(dl);
};

/**
 * Changes one fact: `which` is its key or its place (0 first). Only the fields given change:
 * setFact(dl, 'gas', { value: '638', delta: { text: '−8.7%', tone: 'good' } }).
 */
export const setFact = (dl, which, f) => {
  const tiles = tilesOf(dl);
  const div = typeof which === 'number' ? tiles[which] : tiles.find((t) => t.dataset.key === String(which));
  if (div) apply(dl, div, f, false);
  return div;
};

const seen = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), seen.unobserve(e.target))), { threshold: 0.4 });

// Once, as it comes into view; again after setFacts draws the facts anew.
export const arrive = (dl) => {
  dl.classList.remove('in');
  if (seen) seen.observe(dl);
  else dl.classList.add('in');
};
