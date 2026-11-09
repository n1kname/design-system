// Asserts every colour pairing against the built tokens. AA is a hard
// requirement: a component that invents a colour pair adds its assertion here
// before shipping. Exits non-zero on any failure.

import { readFileSync, writeFileSync } from 'node:fs';
import { contrast, deltaE, hexToOklch, over } from './color.mjs';

const values = JSON.parse(readFileSync(new URL('../dist/values.json', import.meta.url), 'utf8'));

// (foreground, background, minimum, label)
const PAIRS = [
  ['text', 'bg', 4.5, 'body text on page'],
  ['text', 'surface', 4.5, 'body text on card'],
  ['text', 'surface-tint', 4.5, 'body text on tinted card'],
  ['text-muted', 'bg', 4.5, 'muted text on page'],
  ['text-muted', 'surface', 4.5, 'muted text on card'],
  ['text-accent', 'bg', 4.5, 'link on page'],
  ['text-accent', 'surface', 4.5, 'link on card'],
  ['on-accent', 'accent', 4.5, 'label on accent fill'],
  ['on-accent', 'accent-hover', 4.5, 'label on a primary button, hovered'],
  ['accent-edge', 'surface', 3, 'selected button edge on card'],
  ['accent-edge', 'bg', 3, 'accent as large type or meaningful graphic'],
  ['border-strong', 'bg', 3, 'form control boundary'],
  ['focus', 'bg', 3, 'focus ring on page'],
  ['focus', 'surface', 3, 'focus ring on card'],
  ['text-accent', 'surface-tint', 4.5, 'accent label on tinted chip'],
  ['text', 'surface-tint', 4.5, 'closing statement on tinted panel'],
  ['text-muted', 'surface-sunken', 4.5, 'caption on sunken plate'],
  ['text-accent', 'surface-sunken', 4.5, 'warm tag on sunken plate'],
  ['text', 'surface-hover', 4.5, 'text on a hovered table row'],
  ['text-muted', 'surface-hover', 4.5, 'muted text on a hovered table row'],
  ['status-critical', 'surface', 3, 'trend icon on a card'],
  ['text-muted', 'surface', 4.5, 'table header on card'],
  ['diagram-primary-text', 'diagram-primary-bg', 4.5, 'label in primary node'],
  ['diagram-second-text', 'diagram-second-bg', 4.5, 'label in secondary node'],
  ['diagram-leaf-text', 'diagram-leaf-bg', 4.5, 'label in leaf node'],
  ['diagram-passive-text', 'diagram-passive-bg', 4.5, 'label in passive node'],
  ['diagram-line', 'bg', 3, 'connector line on page'],
  ['diagram-edge', 'bg', 3, 'node edge on page'],
  ['diagram-edge', 'diagram-leaf-bg', 3, 'node edge against its own fill'],
  ['diagram-second-border', 'bg', 3, 'secondary node edge on page'],
  // The primary node's fill is under 3:1 on light; its border carries 1.4.11.
  ['diagram-primary-border', 'bg', 3, 'primary node edge on page'],
  ['tag-cool-text', 'tag-cool-bg', 4.5, 'label on focus-area tag'],
  ['text-secondary', 'bg', 4.5, 'secondary text on page'],
  ['text-secondary', 'surface', 4.5, 'secondary text on card'],
  ['text-secondary', 'surface-sunken', 4.5, 'secondary text on sunken plate'],
];

// A chart can sit on any of these, so marks and text are held against all of them.
const CHART_SURFACES = ['bg', 'surface', 'surface-sunken'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `chart-${i}`);
const STATUS = ['status-good', 'status-warning', 'status-serious', 'status-critical'];
const SEQ = (name) => [1, 2, 3, 4, 5, 6, 7].map((i) => `${name}-${i}`);
const DIV_NEG = [1, 2, 3].map((i) => `div-neg-${i}`);
const DIV_POS = [1, 2, 3].map((i) => `div-pos-${i}`);

// The dark ceiling is above the usual 0.67 so the brand orange can be itself there.
const BAND = { light: [0.43, 0.77], dark: [0.48, 0.76] };
const CHROMA_FLOOR = 0.1;
// Deep teal cannot reach the floor inside sRGB. It stays far from the orange, which is
// what the floor protects, and it matches the teal the tags already use.
const CHROMA_FLOOR_TEAL = 0.08;
const CVD_TARGET = 8;
const TRITAN_FLOOR = 6;
const NORMAL_FLOOR = 15;
// Non-neighbours can sit close for colour-blind readers; for normal vision they must not.
const ANY_PAIR_FLOOR = 10;
// Neighbours stay apart when printed in grey. A project floor: no standard sets one.
const GREY_FLOOR = 1.25;
const LABEL_INK = '#FFFFFF';
const HEAT = [1, 2, 3, 4, 5, 6].map((i) => `heat-${i}`);
// A floating panel over a map (FloatPanel.astro) is the surface at this opacity: it must hold
// every text token at AA over whatever map is under it, pure black and white included.
const FLOAT_ALPHA = 0.93;
// A title on the scrim over a full-bleed map (MapStage fill, head="scrim") sits on the page
// background at this opacity, where the band is solid behind the words.
const SCRIM_ALPHA = 0.95;
const cvd = (a, b) => Math.min(deltaE(a, b, 'protan'), deltaE(a, b, 'deutan'));

let total = 0;
let failures = 0;
let section = '';
const results = [];
const heading = (text) => {
  section = text;
  console.log(`\n${text}`);
};
const assert = (ok, line) => {
  total++;
  if (!ok) failures++;
  results.push({ section, ok, line: line.trim() });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${line}`);
};
const ratio = (x, min, label, a, b) =>
  assert(x >= min, `${x.toFixed(2).padStart(5)}:1  (min ${min})  ${label}  ${a} on ${b}`);

for (const mode of ['light', 'dark']) {
  const t = values[mode];
  heading(`${mode}: pairings`);
  for (const [fg, bg, min, label] of PAIRS) ratio(contrast(t[fg], t[bg]), min, label, t[fg], t[bg]);

  heading(`${mode}: categorical`);
  for (const s of SLOTS) {
    const [L, C] = hexToOklch(t[s]);
    assert(L >= BAND[mode][0] && L <= BAND[mode][1], `${s} ${t[s]} L ${L.toFixed(3)} in band ${BAND[mode].join('-')}`);
    const floor = s === 'chart-2' ? CHROMA_FLOOR_TEAL : CHROMA_FLOOR;
    assert(C >= floor, `${s} ${t[s]} C ${C.toFixed(3)} >= ${floor}`);
    for (const bg of CHART_SURFACES) ratio(contrast(t[s], t[bg]), 3, `${s} on ${bg}`, t[s], t[bg]);
  }
  SLOTS.slice(1).forEach((s, i) => {
    const prev = SLOTS[i];
    assert(cvd(t[prev], t[s]) >= CVD_TARGET, `${prev} vs ${s} colour-blind deltaE ${cvd(t[prev], t[s]).toFixed(1)} >= ${CVD_TARGET}`);
    assert(deltaE(t[prev], t[s]) >= NORMAL_FLOOR, `${prev} vs ${s} normal deltaE ${deltaE(t[prev], t[s]).toFixed(1)} >= ${NORMAL_FLOOR}`);
    const tritan = deltaE(t[prev], t[s], 'tritan');
    assert(tritan >= TRITAN_FLOOR, `${prev} vs ${s} tritan deltaE ${tritan.toFixed(1)} >= ${TRITAN_FLOOR}`);
    assert(contrast(t[prev], t[s]) >= GREY_FLOOR, `${prev} vs ${s} in greyscale ${contrast(t[prev], t[s]).toFixed(2)}:1 >= ${GREY_FLOOR}`);
  });
  SLOTS.forEach((a, i) => SLOTS.slice(i + 1).forEach((b) => {
    assert(deltaE(t[a], t[b]) >= ANY_PAIR_FLOOR, `${a} vs ${b} any-pair normal deltaE ${deltaE(t[a], t[b]).toFixed(1)} >= ${ANY_PAIR_FLOOR}`);
  }));
  // A label inside a fill takes white or the dark ink, whichever passes AA.
  for (const s of SLOTS) {
    const best = Math.max(contrast(LABEL_INK, t[s]), contrast(values.light.text, t[s]));
    assert(best >= 4.5, `label on ${s} ${t[s]} reaches ${best.toFixed(2)}:1 >= 4.5`);
  }
  // Scatter, maps and small multiples can seat any two side by side: first three only.
  for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
    const [x, y] = [t[SLOTS[p]], t[SLOTS[q]]];
    assert(cvd(x, y) >= CVD_TARGET && deltaE(x, y) >= NORMAL_FLOOR && deltaE(x, y, 'tritan') >= TRITAN_FLOOR, `all-pairs chart-${p + 1} vs chart-${q + 1} deltaE ${cvd(x, y).toFixed(1)} / ${deltaE(x, y).toFixed(1)}`);
  }

  heading(`${mode}: sequential`);
  for (const name of ['seq', 'seq2']) {
    const steps = SEQ(name).map((k) => t[k]);
    const Ls = steps.map((h) => hexToOklch(h)[0]);
    const dir = mode === 'light' ? -1 : 1;
    Ls.slice(1).forEach((L, i) => {
      const step = (L - Ls[i]) * dir;
      assert(step >= 0.06, `${name}-${i + 1} to ${i + 2} lightness step ${step.toFixed(3)} >= 0.06, one direction`);
    });
    for (const bg of CHART_SURFACES) {
      // Step 1 may recede: it means "almost nothing". The top must stand alone,
      // and steps 3 and up are the floor for discrete marks (tiers, buckets).
      ratio(contrast(steps[6], t[bg]), 3, `${name}-7 on ${bg}`, steps[6], t[bg]);
      ratio(contrast(steps[2], t[bg]), 1.5, `${name}-3 on ${bg}, floor for discrete marks`, steps[2], t[bg]);
    }
    const hues = steps.map((h) => hexToOklch(h)[2]);
    const spread = Math.max(...hues) - Math.min(...hues);
    assert(spread < 25, `${name} stays one hue (spread ${spread.toFixed(1)} degrees)`);
  }

  heading(`${mode}: diverging`);
  const midC = hexToOklch(t['div-mid'])[1];
  assert(midC <= 0.012, `div-mid ${t['div-mid']} chroma ${midC.toFixed(3)} <= 0.012, reads as nothing`);
  [DIV_NEG, DIV_POS].forEach((arm) => {
    const Ls = arm.map((k) => hexToOklch(t[k])[0]);
    const dir = mode === 'light' ? -1 : 1;
    Ls.slice(1).forEach((L, i) => assert((L - Ls[i]) * dir >= 0.06, `${arm[i]} to ${arm[i + 1]} moves away from the midpoint`));
    for (const bg of CHART_SURFACES) ratio(contrast(t[arm[2]], t[bg]), 3, `${arm[2]} on ${bg}`, t[arm[2]], t[bg]);
    assert(deltaE(t[arm[0]], t['div-mid']) >= 15, `${arm[0]} vs div-mid deltaE ${deltaE(t[arm[0]], t['div-mid']).toFixed(1)} >= 15`);
  });
  DIV_NEG.forEach((k, i) => {
    const d = cvd(t[k], t[DIV_POS[i]]);
    assert(d >= CVD_TARGET, `${k} vs ${DIV_POS[i]} colour-blind deltaE ${d.toFixed(1)} >= ${CVD_TARGET}`);
  });

  heading(`${mode}: status and chrome`);
  for (const s of STATUS) for (const bg of CHART_SURFACES) ratio(contrast(t[s], t[bg]), 3, `${s} on ${bg}`, t[s], t[bg]);
  assert(cvd(t['status-good'], t['status-critical']) >= CVD_TARGET, `good vs critical colour-blind deltaE ${cvd(t['status-good'], t['status-critical']).toFixed(1)}`);
  for (const k of ['chart-axis', 'chart-neutral']) for (const bg of CHART_SURFACES) ratio(contrast(t[k], t[bg]), 3, `${k} on ${bg}`, t[k], t[bg]);
  assert(deltaE(t['chart-2'], t['chart-1']) >= 25, `chart-2 vs chart-1 deltaE ${deltaE(t['chart-2'], t['chart-1']).toFixed(1)} >= 25, the leading pair`);
  assert(deltaE(t['chart-neutral'], t['chart-1']) >= NORMAL_FLOOR, `chart-neutral vs chart-1 deltaE ${deltaE(t['chart-neutral'], t['chart-1']).toFixed(1)}`);

  // Record states: missing must stand out from the card, and from complete by hue, also for
  // colour-blind readers (a hairline of card cuts every gap out of the strip besides); set aside
  // must show its stripes, and the two quiet solids must not be taken for each other.
  heading(`${mode}: record states`);
  for (const bg of CHART_SURFACES) ratio(contrast(t['state-missing'], t[bg]), 3, `state-missing on ${bg}`, t['state-missing'], t[bg]);
  assert(deltaE(t['state-missing'], t['state-complete']) >= 25, `state-missing vs state-complete deltaE ${deltaE(t['state-missing'], t['state-complete']).toFixed(1)} >= 25`);
  assert(cvd(t['state-missing'], t['state-complete']) >= CVD_TARGET, `state-missing vs state-complete colour-blind deltaE ${cvd(t['state-missing'], t['state-complete']).toFixed(1)} >= ${CVD_TARGET}`);
  for (const bg of CHART_SURFACES) ratio(contrast(t['state-set-aside'], t[bg]), 3, `state-set-aside stripes on ${bg}`, t['state-set-aside'], t[bg]);
  assert(deltaE(t['state-complete'], t['state-waiting']) >= NORMAL_FLOOR, `state-complete vs state-waiting deltaE ${deltaE(t['state-complete'], t['state-waiting']).toFixed(1)} >= ${NORMAL_FLOOR}`);
  assert(cvd(t['state-complete'], t['state-waiting']) >= CVD_TARGET, `state-complete vs state-waiting colour-blind deltaE ${cvd(t['state-complete'], t['state-waiting']).toFixed(1)} >= ${CVD_TARGET}`);

  // Heat: a map's density, cold to warm. It reads by hue, so neighbours must stay apart for
  // colour-blind readers too, and a label inside any step must reach AA with one of the two inks.
  // Lightness is not asserted: it rises to the yellow and falls to the red, both ends near L 0.6.
  heading(`${mode}: heat and map panels`);
  for (const k of HEAT) assert(t[k] === values[mode === 'light' ? 'dark' : 'light'][k], `${k} ${t[k]} is the same in both themes`);
  HEAT.slice(1).forEach((k, i) => {
    const prev = HEAT[i];
    assert(deltaE(t[prev], t[k]) >= ANY_PAIR_FLOOR, `${prev} vs ${k} normal deltaE ${deltaE(t[prev], t[k]).toFixed(1)} >= ${ANY_PAIR_FLOOR}`);
    assert(cvd(t[prev], t[k]) >= CVD_TARGET, `${prev} vs ${k} colour-blind deltaE ${cvd(t[prev], t[k]).toFixed(1)} >= ${CVD_TARGET}`);
    const tritan = deltaE(t[prev], t[k], 'tritan');
    assert(tritan >= TRITAN_FLOOR, `${prev} vs ${k} tritan deltaE ${tritan.toFixed(1)} >= ${TRITAN_FLOOR}`);
  });
  assert(cvd(t['heat-1'], t['heat-6']) >= CVD_TARGET, `heat-1 vs heat-6 colour-blind deltaE ${cvd(t['heat-1'], t['heat-6']).toFixed(1)} >= ${CVD_TARGET}, low is not taken for high`);
  for (const k of HEAT) {
    const [w, d] = [contrast(LABEL_INK, t[k]), contrast(values.light.text, t[k])];
    assert(Math.max(w, d) >= 4.5, `label on ${k} ${t[k]} reaches ${Math.max(w, d).toFixed(2)}:1 in ${w > d ? 'white' : 'dark ink'} >= 4.5`);
  }
  for (const under of ['#000000', '#FFFFFF', ...HEAT.map((k) => t[k])]) {
    const panel = over(t.surface, FLOAT_ALPHA, under);
    for (const fg of ['text', 'text-secondary', 'text-muted']) ratio(contrast(t[fg], panel), 4.5, `${fg} on a floating panel over ${under}`, t[fg], panel);
    const band = over(t.bg, SCRIM_ALPHA, under);
    for (const fg of ['text', 'text-muted']) ratio(contrast(t[fg], band), 4.5, `${fg} on the title scrim over ${under}`, t[fg], band);
  }
}

writeFileSync(new URL('../dist/report.json', import.meta.url), JSON.stringify({ total, failures, results }, null, 2) + '\n');
console.log(`\n${failures} failure(s) of ${total} checks.`);
process.exit(failures ? 1 : 0);
