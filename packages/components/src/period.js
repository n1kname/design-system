// Drives PeriodPicker. Its state is in the page: the periods are the list's buttons (newest
// first), the choice is data-value on the picker and, with data-param, the address too. So a
// picker needs no object kept anywhere, and setPeriods() can fill one at any time.
//
//     import { setPeriods } from '@n1kname/components/period.js';
//     picker.addEventListener('period-change', (e) => show(e.detail.value));
//     setPeriods(picker, ['2011', '2012', ..., '2026']); // oldest first
//
// A period is a string, shown and kept as it is, or { value, label }: the label on the button and
// in the list ("Nov 2026"), the value in the address and in `period-change` ("2026-11").

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// A motion token in milliseconds; the tokens are written in seconds.
const ms = (name, fallback) => {
  const v = token(name);
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : v.endsWith('ms') ? n : n * 1000;
};

// Oldest first.
const optionsOf = (root) => [...root.querySelectorAll('.periods .option')].reverse();
const periodsOf = (root) => optionsOf(root).map((o) => o.dataset.value);
// What a value says: its option's label, the words for all, or nothing before the periods are known.
const nameOf = (root, v) => {
  if (v === undefined) return '';
  if (v === 'all') return root.dataset.all ?? '';
  return optionsOf(root).find((o) => o.dataset.value === v)?.textContent ?? v;
};
// A period as a string or { value, label }, made { value, label }.
const asPeriod = (p) => (p !== null && typeof p === 'object' ? { value: String(p.value), label: String(p.label ?? p.value) } : { value: String(p), label: String(p) });

// The choice: the address's, when the picker keeps it there and it names a period or all. Before
// the periods are known, a picker with no initial period has no choice (undefined), and a kept
// choice that is no longer one of the periods falls back to all or the newest.
export const periodOf = (root) => {
  const periods = periodsOf(root);
  const all = root.dataset.all !== undefined;
  const kept = root.dataset.value;
  const valid = kept !== undefined && (kept === 'all' ? all : !periods.length || periods.includes(kept));
  const fallback = valid ? kept : all ? 'all' : periods.at(-1);
  if (!root.dataset.param) return fallback;
  const asked = new URL(location.href).searchParams.get(root.dataset.param);
  if (asked === null) return all ? 'all' : fallback;
  return !periods.length || periods.includes(asked) ? asked : fallback;
};

// The period rolls by a line: up when time goes forward, down when it goes back.
const roll = (root, to, dir) => {
  const label = root.querySelector('.label');
  const old = label.querySelector('.now');
  if (old.textContent === nameOf(root, to)) return;
  const now = document.createElement('span');
  now.className = 'now';
  now.textContent = nameOf(root, to);
  label.append(now);
  if (!dir || reduced()) return old.remove();
  const timing = { duration: ms('--motion-spring', 340), easing: token('--ease-spring') || 'ease-out' };
  old.classList.remove('now');
  old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-dir * 100}%)`, opacity: 0 }], { ...timing, fill: 'forwards' }).finished.then(() => old.remove());
  now.animate([{ transform: `translateY(${dir * 100}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], timing);
};

// Shows the choice: the label, the steps that lead somewhere, the pressed period in the list.
const sync = (root, dir = 0) => {
  const v = periodOf(root);
  const periods = periodsOf(root);
  const all = root.dataset.all !== undefined;
  // Never the word "undefined": a picker built with no periods has no choice until they come.
  if (v === undefined) delete root.dataset.value;
  else root.dataset.value = v;
  roll(root, v, dir);
  const [prev, next] = root.querySelectorAll('.step');
  const at = periods.indexOf(v);
  prev.disabled = !periods.length || at === 0;
  next.disabled = !periods.length || v === 'all' || (!all && at === periods.length - 1);
  root.querySelectorAll('.option').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.value === v)));
  // The sizer holds the longest words the label may show, so the control keeps its width.
  const longest = [root.dataset.all ?? '', ...optionsOf(root).map((o) => o.textContent)].reduce((a, b) => (b.length > a.length ? b : a), '');
  root.querySelector('.sizer').textContent = longest || nameOf(root, v);
};

const go = (root, v, dir) => {
  if (root.dataset.param) {
    const url = new URL(location.href);
    if (v === 'all') url.searchParams.delete(root.dataset.param);
    else url.searchParams.set(root.dataset.param, v);
    history.pushState(null, '', url);
  }
  root.dataset.value = v;
  sync(root, dir);
  changed(root);
};

// `period-change`: the value, and the words the button shows for it.
const changed = (root) => {
  const value = root.dataset.value;
  root.dispatchEvent(new CustomEvent('period-change', { bubbles: true, detail: { value, label: nameOf(root, value) } }));
};

// Fills a picker with its periods, oldest first, and shows it. Each a string, or { value, label }.
export const setPeriods = (root, periods) => {
  root.querySelector('.periods').replaceChildren(
    ...[...periods].reverse().map((p) => {
      const { value, label } = asPeriod(p);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      b.dataset.value = value;
      b.textContent = label;
      return b;
    }),
  );
  root.hidden = false;
  sync(root);
};

// Run once per picker, by PeriodPicker itself.
export const wirePeriodPicker = (root) => {
  const list = root.querySelector('.period-list');
  const button = root.querySelector('.current');

  root.querySelectorAll('.step').forEach((step) =>
    step.addEventListener('click', () => {
      const dir = Number(step.dataset.step);
      const periods = periodsOf(root);
      const v = periodOf(root);
      // The line runs oldest to newest, then all: back from all is the newest.
      const to = v === 'all' ? periods.at(-1) : (periods[periods.indexOf(v) + dir] ?? 'all');
      go(root, to, dir);
    }),
  );

  list.addEventListener('click', (e) => {
    const o = e.target.closest('.option');
    if (!o) return;
    const periods = periodsOf(root);
    const was = periodOf(root);
    const to = o.dataset.value;
    list.hidePopover();
    button.focus();
    if (to === was) return;
    const later = to === 'all' || (was !== 'all' && periods.indexOf(to) > periods.indexOf(was));
    go(root, to, later ? 1 : -1);
  });

  // The list opens under the control, kept inside the window, with focus on the chosen period.
  list.addEventListener('toggle', (e) => {
    const open = e.newState === 'open';
    button.setAttribute('aria-expanded', String(open));
    if (!open) {
      // Closed from inside, by Escape or a choice: focus goes back to the control (Safari
      // leaves it on the page).
      if (list.contains(document.activeElement) || document.activeElement === document.body) button.focus();
      return;
    }
    const r = root.getBoundingClientRect();
    const w = list.offsetWidth;
    list.style.top = `${r.bottom + 6}px`;
    list.style.left = `${Math.max(16, Math.min(r.right - w, innerWidth - w - 16))}px`;
    // After the browser has finished opening it, which would otherwise keep focus on the button.
    requestAnimationFrame(() => (list.querySelector('[aria-pressed="true"]') ?? list.querySelector('.option'))?.focus());
  });

  // Arrow keys move through the list in reading order, all first.
  list.addEventListener('keydown', (e) => {
    const options = [...list.querySelectorAll('.option')];
    const at = options.indexOf(document.activeElement);
    const cols = getComputedStyle(list.querySelector('.periods')).gridTemplateColumns.split(' ').length;
    const step = { ArrowRight: 1, ArrowDown: e.target.classList.contains('all') ? 1 : cols, ArrowLeft: -1, ArrowUp: -cols }[e.key];
    if (step === undefined || at < 0) return;
    e.preventDefault();
    options[Math.max(0, Math.min(options.length - 1, at + step))].focus();
  });

  if (root.dataset.param) {
    addEventListener('popstate', () => {
      const was = root.dataset.value;
      sync(root);
      if (root.dataset.value !== was) changed(root);
    });
  }
  sync(root);
};
