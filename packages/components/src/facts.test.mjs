// Made-up figures only.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { parseHTML } from 'linkedom';

// The icons live in a .ts module that Vite resolves without its extension; Node needs it named.
registerHooks({ resolve: (spec, ctx, next) => next(spec === './icons' ? './icons.ts' : spec, ctx) });
const { factsHTML, setFacts, setFact, PLACEHOLDER } = await import('./facts.js');

const { document, window } = parseHTML('<html><body></body></html>');
globalThis.document = document;
// What settle needs: motion allowed, the tokens unset, and a record of what moved.
const settled = [];
globalThis.matchMedia = () => ({ matches: false });
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
window.HTMLElement.prototype.animate = function () {
  settled.push(this);
};
const strip = (attrs = '') => {
  document.body.innerHTML = `<div data-chart-motion="update"><dl data-facts data-variant="tiles" ${attrs}></dl></div>`;
  return document.querySelector('dl');
};
const text = (el, sel) => el.querySelector(sel)?.textContent;

// Plain, with a unit, and with a line led by a change.
{
  const { html, count, context } = factsHTML([
    { label: 'Avg sleep', value: '7h 40m' },
    { label: 'Resting HR', value: '52', unit: 'bpm', icon: 'heart-pulse', accent: 'var(--c-chart-8)' },
    { label: 'Gas', value: '612', unit: 'm³', delta: { text: '−6.1%', tone: 'good' }, context: 'against 652 last year', key: 'gas' },
  ]);
  assert.equal(count, '3');
  assert.equal(context, true, 'one line is enough to keep the row for all');
  const dl = strip();
  dl.innerHTML = html;
  const [a, b, c] = dl.querySelectorAll(':scope > div');
  assert.equal(text(a, '.fact-figure'), '7h 40m');
  assert.equal(text(a, '.fact-unit'), '');
  assert.equal(text(b, '.fact-unit'), 'bpm');
  assert.match(b.getAttribute('style'), /--accent:var\(--c-chart-8\)/);
  assert.ok(b.querySelector('dt svg[aria-hidden="true"]'), 'icon drawn, hidden');
  assert.equal(c.dataset.key, 'gas');
  assert.equal(c.querySelector('.fact-delta').dataset.tone, 'good');
  assert.equal(text(c, '.fact-context'), '−6.1% against 652 last year');
  assert.equal(c.querySelectorAll('dd').length, 2, 'figure and line, each a dd of the label');
}

// Unknown is a dash, and a unit never stands alone.
{
  const { html } = factsHTML([{ label: 'VO₂ max', unit: 'mL/kg/min' }, { label: 'Steps', value: '—' }, { label: 'Zero', value: '0', unit: 'km' }]);
  const dl = strip();
  dl.innerHTML = html;
  const [a, b, c] = dl.querySelectorAll(':scope > div');
  assert.equal(text(a, '.fact-figure'), PLACEHOLDER);
  assert.equal(text(a, '.fact-unit'), '');
  assert.equal(text(b, '.fact-figure'), PLACEHOLDER);
  assert.equal(text(c, '.fact-figure'), '0', '0 is a figure');
  assert.equal(text(c, '.fact-unit'), 'km');
}

// Pills and lists: units, but no line under the figure.
{
  const { html, context } = factsHTML([{ label: 'Distance', value: '12.4', unit: 'km', context: 'ignored' }], { variant: 'pills' });
  assert.equal(context, false);
  assert.ok(!html.includes('fact-context'));
  assert.ok(html.includes('>km<'));
}

// Text is escaped, attributes too.
{
  const { html } = factsHTML([{ label: '<b>', value: '"1"', key: 'a"b', context: '<i>x</i>' }]);
  assert.ok(!html.includes('<b>') && !html.includes('<i>'));
  assert.ok(html.includes('data-key="a&quot;b"'));
}

// Ids for a page that writes its own figures, as with Stat.
{
  const { html, context } = factsHTML([{ label: 'Costs', valueId: 'tile-total', contextId: 'sub-total' }]);
  assert.equal(context, true, 'a contextId keeps the line');
  const dl = strip();
  dl.innerHTML = html;
  assert.equal(document.getElementById('tile-total').className, 'fact-figure');
  assert.equal(document.getElementById('sub-total').className, 'fact-context');
}

// setFacts: drawn anew when the count changes, changed in place when it doesn't.
{
  const dl = strip();
  setFacts(dl, [{ label: 'A', value: '1' }, { label: 'B', value: '2' }]);
  assert.equal(dl.dataset.count, '2');
  assert.equal(dl.dataset.context, undefined, 'no lines, no row for them');
  const first = dl.querySelector(':scope > div');
  setFacts(dl, [{ label: 'A', value: '3', unit: 'km', context: 'this week' }, { label: 'B', value: '4' }]);
  assert.equal(dl.querySelector(':scope > div'), first, 'same tile, changed in place');
  assert.equal(text(first, '.fact-figure'), '3');
  assert.deepEqual(settled, [first.querySelector('.fact-value'), dl.querySelectorAll('.fact-value')[1]], 'changed figures settle, on a page that asks for update motion');
  assert.equal(text(first, '.fact-unit'), 'km');
  assert.equal(text(first, '.fact-context'), 'this week');
  assert.equal(dl.dataset.context, '', 'a line arrived: the row is kept');
  setFacts(dl, [{ label: 'A', value: '3' }, { label: 'B', value: '4' }]);
  assert.equal(dl.dataset.context, undefined, 'every line gone: the row goes too');
  setFacts(dl, Array.from({ length: 8 }, (_, i) => ({ label: `F${i}`, value: String(i) })));
  assert.equal(dl.dataset.count, 'many');
  assert.equal(dl.querySelectorAll(':scope > div').length, 8);
}

// The highlighter survives an update in place.
{
  const dl = strip('data-highlight');
  setFacts(dl, [{ label: 'A', value: '1' }]);
  assert.equal(text(dl, '.fact-figure mark'), '1');
  setFacts(dl, [{ label: 'A', value: '2' }]);
  assert.equal(text(dl, '.fact-figure mark'), '2');
}

// setFact: only the fields given change, found by key or by place.
{
  const dl = strip();
  setFacts(dl, [
    { label: 'Gas', key: 'gas', unit: 'm³', context: 'against 652', icon: 'flame' },
    { label: 'Degree days', key: 'hdd' },
  ]);
  const gas = dl.querySelector('[data-key="gas"]');
  const icon = gas.querySelector('dt svg');
  assert.equal(text(gas, '.fact-unit'), '', 'no unit while the figure waits');
  settled.length = 0;
  setFact(dl, 'gas', { value: '612' });
  assert.equal(settled.length, 0, 'a figure arriving in place of the dash just appears');
  assert.equal(text(gas, '.fact-figure'), '612');
  assert.equal(text(gas, '.fact-unit'), 'm³', 'the unit given earlier comes with the figure');
  assert.equal(text(gas, '.fact-context'), 'against 652', 'the line is left as it was');
  assert.equal(gas.querySelector('dt svg'), icon, 'the label is left as it was, icon and all');
  setFact(dl, 'gas', { delta: { text: '+2.0%', tone: 'bad' } });
  assert.equal(gas.querySelector('.fact-delta').dataset.tone, 'bad');
  assert.equal(text(gas, '.fact-context'), '+2.0% against 652', 'the change leads the line it was given');
  setFact(dl, 1, { label: 'Degree days, Oct–Mar' });
  assert.equal(text(dl.querySelector('[data-key="hdd"]'), 'dt'), 'Degree days, Oct–Mar');
  assert.equal(setFact(dl, 'nope', { value: '1' }), undefined);
  setFact(dl, 'gas', { delta: 'flat' });
  assert.equal(gas.querySelector('.fact-delta').dataset.tone, 'neutral', 'a string is a neutral change');
}

console.log('facts: ok');
