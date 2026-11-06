// Drives SearchField, and helps a page search what it shows. The field fires `search-change`
// with the query on every change (typing, clearing, Escape, or the address on load).
//
//     import { matchWords, mark, say } from '@n1kname/components/search.js';
//     field.addEventListener('search-change', (e) => {
//       const found = matchWords(rows, ['name', 'place'], e.detail.query);
//       draw(found, e.detail.query);                 // mark(text, query) marks the matched words
//       say(field, `${found.length} of ${rows.length} rows`);
//     });
//
// Matching is every word, in any field, ignoring case and accents: predictable, and good for
// names and places. For typos, a page can bring its own fuzzy matcher; the field doesn't mind.

// Lowercase, without accents, for comparing: "Café" and "cafe" are the same.
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const words = (q) => fold(q).split(/\s+/).filter(Boolean);

// The items with every word of the query in one of their `keys`.
export const matchWords = (items, keys, q) => {
  const ws = words(q);
  if (!ws.length) return items;
  return items.filter((item) => {
    const hay = keys.map((k) => fold(item[k])).join(' ');
    return ws.every((w) => hay.includes(w));
  });
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The text, escaped, with each matched word of two letters or more in a <mark>, written as it was.
export const mark = (text, q) => {
  const s = String(text ?? '');
  const ws = words(q).filter((w) => w.length > 1);
  if (!ws.length || !s) return esc(s);
  const folded = fold(s);
  const hits = [];
  for (const w of ws) {
    for (let at = folded.indexOf(w); at >= 0; at = folded.indexOf(w, at + w.length)) hits.push([at, at + w.length]);
  }
  if (!hits.length) return esc(s);
  hits.sort((a, b) => a[0] - b[0]);
  let out = '';
  let last = 0;
  for (const [a, b] of hits) {
    if (a < last) continue;
    out += `${esc(s.slice(last, a))}<mark>${esc(s.slice(a, b))}</mark>`;
    last = b;
  }
  return out + esc(s.slice(last));
};

// The result, said once typing pauses (400 ms after the last change), in the field's polite live
// region: "12 of 500 workouts", or "No workouts match".
const timers = new WeakMap();
export const say = (field, text) => {
  clearTimeout(timers.get(field));
  timers.set(
    field,
    setTimeout(() => {
      field.querySelector('[data-search-live]').textContent = text;
    }, 400),
  );
};

export const wireSearch = (root) => {
  const input = root.querySelector('input');
  const param = root.dataset.param;
  if (param) input.value = new URL(location.href).searchParams.get(param) ?? '';
  const changed = () => {
    root.toggleAttribute('data-filled', !!input.value);
    if (param) {
      const u = new URL(location.href);
      if (input.value) u.searchParams.set(param, input.value);
      else u.searchParams.delete(param);
      history.replaceState(history.state, '', u);
    }
    root.dispatchEvent(new CustomEvent('search-change', { detail: { query: input.value } }));
  };
  input.addEventListener('input', changed);
  root.querySelector('[data-search-clear]').addEventListener('click', () => {
    input.value = '';
    changed();
    input.focus();
  });
  // Escape clears; a second Escape leaves the field.
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!input.value) return input.blur();
    e.preventDefault();
    input.value = '';
    changed();
  });
  // The shortcut from anywhere, unless typing somewhere already.
  const key = root.dataset.shortcut;
  if (key)
    addEventListener('keydown', (e) => {
      if (e.key !== key || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  root.toggleAttribute('data-filled', !!input.value);
  // A page listening after this ran still hears the address's query.
  queueMicrotask(changed);
};

// Sets the query from script, as typing would.
export const setQuery = (root, query) => {
  const input = root.querySelector('input');
  input.value = query;
  input.dispatchEvent(new Event('input'));
};
