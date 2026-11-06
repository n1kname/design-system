// Changes a Legend's keys from script, for keys that follow the data (the types in a year, say).
// Keys that stay keep their element and place; new ones fade in, gone ones fade out.
//
//     import { setKeys } from '@n1kname/components/legend.js';
//     setKeys(legend, [{ label: 'Walking', color: 'var(--c-chart-5)' }, …]);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const setKeys = (ul, keys) => {
  // Keys built by Legend have no data-key yet: their label is their key.
  for (const li of ul.children) if (!li.dataset.key) li.dataset.key = li.textContent.trim();
  // The scoped attribute Astro gave the legend's items, so new ones are styled the same.
  const scope = [...(ul.firstElementChild?.attributes ?? [])].find((a) => a.name.startsWith('data-astro-cid'))?.name;
  const now = new Map([...ul.children].filter((li) => !li.hasAttribute('data-leaving')).map((li) => [li.dataset.key, li]));
  const want = new Set(keys.map((k) => k.label));
  for (const [key, li] of now) {
    if (want.has(key)) continue;
    li.setAttribute('data-leaving', '');
    if (reduced()) li.remove();
    else li.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.9)' }], { duration: 140, easing: 'ease-in' }).finished.then(() => li.remove());
  }
  // In the order given: each key moved to the end in turn, so they end up in order after any
  // that are still fading out.
  for (const k of keys) {
    let li = now.get(k.label);
    if (!li) {
      li = document.createElement('li');
      li.dataset.key = k.label;
      li.innerHTML = `<i class="mark" data-mark="${k.mark ?? 'fill'}"${k.color ? ` style="--mark:${k.color}"` : ''}></i>${esc(k.label)}`;
      if (scope) {
        li.setAttribute(scope, '');
        li.firstElementChild.setAttribute(scope, '');
      }
      if (!reduced()) li.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 120, easing: 'ease-out', fill: 'backwards' });
    }
    ul.append(li);
  }
};
