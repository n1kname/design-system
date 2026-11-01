// Writes the DTCG 2025.10 token files from OKLCH parameters. Every ramp is
// computed here; nothing downstream invents a colour. Style Dictionary then
// turns these files into CSS (build.mjs) and check.mjs asserts every pairing.
//
// Anchors the ramps were tuned to:
//   #421800 deep warm brown  the hue of the neutral ramp
//   #FFF5F0 warm white       the light end
//   #FF6711 bright orange    accent 500
//   #A63C00 burnt orange     accent 700, the AA-safe text orange

import { mkdirSync, writeFileSync } from 'node:fs';
import { hexToOklch, hexToRgb, oklch } from './color.mjs';

const OUT = new URL('../tokens/', import.meta.url);
const NEUTRAL_HUE = hexToOklch('#421800')[2];
const ACCENT_HUE = hexToOklch('#FF6711')[2];
const TEAL_HUE = 200;

// ------------------------------------------------------------------ primitives

// Warm throughout. Chroma peaks in the light-mid range and tapers at both ends,
// so the darks stay neutral-warm rather than muddy brown.
const NEUTRAL_STEPS = [
  ['50', 0.985, 0.008], ['100', 0.965, 0.014], ['150', 0.94, 0.022], ['200', 0.905, 0.03],
  ['300', 0.84, 0.032], ['400', 0.74, 0.03], ['500', 0.63, 0.032], ['600', 0.53, 0.036],
  ['700', 0.43, 0.04], ['800', 0.33, 0.042], ['900', 0.24, 0.038], ['950', 0.175, 0.028],
];

const ACCENT_STEPS = [
  ['50', 0.97, 0.02], ['100', 0.935, 0.042], ['200', 0.88, 0.075], ['300', 0.81, 0.115],
  ['400', 0.735, 0.165], ['500', 0.686, 0.196], ['600', 0.605, 0.175], ['700', 0.51, 0.145],
  ['800', 0.42, 0.115], ['900', 0.33, 0.088],
];

const STATUS_STEPS = [['400', 0.7, 0.13], ['600', 0.56, 0.15], ['700', 0.48, 0.13]];

const ramp = (steps, hue) => Object.fromEntries(steps.map(([k, L, C]) => [k, oklch(L, C, hue)]));

const neutral = ramp(NEUTRAL_STEPS, NEUTRAL_HUE);
const accent = ramp(ACCENT_STEPS, ACCENT_HUE);
const success = ramp(STATUS_STEPS, 155);
const danger = ramp(STATUS_STEPS, 27);
// Warning and serious sit in the amber and orange families on purpose steps
// away from the categorical slots, and always ship with an icon and a label.
const warning = { 600: oklch(0.6, 0.125, 85), 400: oklch(0.8, 0.14, 85) };
const serious = { 600: oklch(0.56, 0.15, 55), 400: oklch(0.74, 0.14, 55) };
// Good and critical are set apart in lightness as well as hue: at the same
// lightness, red and green collapse under protanopia and deuteranopia.
const good = { light: oklch(0.62, 0.14, 150), dark: oklch(0.76, 0.14, 150) };
const critical = { light: oklch(0.5, 0.17, 27), dark: oklch(0.62, 0.17, 27) };

// Categorical: eight hues in a fixed order, the same hue per slot in both themes,
// so a series keeps its colour across a theme switch. Orange and teal lead, the pair
// the sites already use: slot 1 is the brand orange as each theme uses it, and slot 2
// is the same teal as the focus tags, deep on light and bright on dark. Lightness
// alternates slot by slot, which keeps neighbours apart in greyscale and for
// colour-blind readers; chroma is held at about 0.11 so no hue shouts over the orange.
// Never reorder one theme alone, and never cycle: a ninth series folds into Other.
const CATEGORICAL_HUES = ['orange', 'teal', 'blue', 'plum', 'sage', 'violet', 'gold', 'rose'];
const HUE = { teal: TEAL_HUE, blue: 265, plum: 335, sage: 145, violet: 288, gold: 85, rose: 15 };
const slot = (rows) => rows.map(([name, L, C]) => oklch(L, C, HUE[name]));
const CATEGORICAL = {
  light: [accent['600'], ...slot([
    ['teal', 0.48, 0.082], ['blue', 0.6, 0.11], ['plum', 0.44, 0.13], ['sage', 0.6, 0.11],
    ['violet', 0.48, 0.11], ['gold', 0.6, 0.11], ['rose', 0.5, 0.11],
  ])],
  dark: [accent['500'], ...slot([
    ['teal', 0.74, 0.11], ['blue', 0.6, 0.11], ['plum', 0.755, 0.13], ['sage', 0.6, 0.11],
    ['violet', 0.73, 0.11], ['gold', 0.6, 0.11], ['rose', 0.7, 0.11],
  ])],
};

// Sequential: one hue, seven steps. The orange ramp lands exactly on the brand
// steps (accent 500, 600, 700, 800). Dark mode reverses the same steps, so step 1
// always means "little" and recedes into the surface.
const SEQ_L = [0.93, 0.86, 0.78, 0.686, 0.605, 0.51, 0.42];
const SEQ_ACCENT = { 0.686: '500', 0.605: '600', 0.51: '700', 0.42: '800' };
const seqOrange = SEQ_L.map((L) => accent[SEQ_ACCENT[L]] ?? oklch(L, 0.04 + (0.93 - L) * 0.6, ACCENT_HUE));
const seqTeal = SEQ_L.map((L) => oklch(L, Math.min(0.11, 0.03 + (0.93 - L) * 0.3), TEAL_HUE));

// Diverging: the teal slot's hue below and the brand orange above, around a
// midpoint with almost no chroma, because a peach midpoint would read as "a little above".
const DIV_L = { light: [0.81, 0.605, 0.51], dark: [0.51, 0.686, 0.81] };
const divNeg = (mode, c) => DIV_L[mode].map((L, i) => oklch(L, c[i], TEAL_HUE));
const DIV = {
  light: { neg: divNeg('light', [0.09, 0.11, 0.1]), mid: oklch(0.93, 0.004, NEUTRAL_HUE), pos: [accent['300'], accent['600'], accent['700']] },
  dark: { neg: divNeg('dark', [0.1, 0.11, 0.08]), mid: oklch(0.33, 0.006, NEUTRAL_HUE), pos: [accent['700'], accent['500'], accent['300']] },
};

const TAG_FOCUS_HUE = 200;

// ------------------------------------------------------------------- semantics

// Role notes:
//   accent         the brand fill. Something sits ON it, so it is judged against
//                  on-accent, not against the page.
//   accent-edge    the accent when it must carry meaning by itself against the
//                  page: large type, a meaningful graphic, a UI boundary. 3:1.
//   border         decorative hairline between content. No WCAG minimum.
//   border-strong  form-control boundaries. WCAG 1.4.11 applies: 3:1.
//   text-secondary between text and text-muted, for a third ink level.
//   chart-*        marks, not text. Text in a chart wears text tokens.
//   status-*       reserved meaning, never "series 4", always icon plus label.
//
// on-accent is the deep brown in BOTH themes: white on the accent fill is under
// 3:1, and dark-on-orange keeps the fill identical in light and dark.

const n = (k) => ({ ref: `primitive.neutral.${k}` });
const a = (k) => ({ ref: `primitive.accent.${k}` });
const chartRefs = (mode) => CATEGORICAL_HUES.map((_, i) => ({ ref: `primitive.chart.${mode}.${i + 1}` }));
const seqRefs = (name, mode) => {
  const steps = SEQ_L.map((_, i) => ({ ref: `primitive.${name}.${i + 1}` }));
  return mode === 'dark' ? steps.reverse() : steps;
};

const semantics = (mode) => {
  const light = mode === 'light';
  const pick = (l, d) => (light ? l : d);
  const out = {
    bg: pick(n('50'), n('950')),
    surface: pick('#FFFFFF', n('900')),
    'surface-sunken': pick(n('100'), '#0D0B09'),
    'surface-tint': pick(a('50'), a('900')),
    border: pick(n('200'), n('800')),
    'border-strong': n('500'),
    text: pick(n('950'), n('100')),
    'text-muted': pick(n('600'), n('400')),
    'text-accent': pick(a('700'), a('400')),
    accent: a('500'),
    'accent-edge': pick(a('600'), a('500')),
    'accent-hover': pick(a('600'), a('400')),
    'on-accent': n('950'),
    focus: pick(a('700'), a('400')),
    // Diagram tiers: hierarchy from a tint ramp plus border weight, not one solid slab.
    'diagram-primary-bg': pick(a('100'), a('900')),
    'diagram-primary-text': pick(n('950'), n('100')),
    'diagram-primary-border': pick(a('600'), a('500')),
    'diagram-second-bg': pick(a('50'), n('900')),
    'diagram-second-text': pick(n('950'), n('100')),
    'diagram-second-border': pick(a('600'), a('700')),
    'diagram-leaf-bg': pick('#FFFFFF', n('900')),
    'diagram-leaf-text': pick(n('950'), n('100')),
    'diagram-passive-bg': pick(n('100'), n('950')),
    'diagram-passive-text': pick(n('600'), n('400')),
    // One edge colour for every unfilled outline and connector: 3:1 against the page.
    'diagram-edge': n('500'),
    'diagram-line': n('500'),
    'tag-cool-bg': pick(oklch(0.955, 0.022, TAG_FOCUS_HUE), oklch(0.31, 0.045, TAG_FOCUS_HUE)),
    'tag-cool-text': pick(oklch(0.42, 0.075, TAG_FOCUS_HUE), oklch(0.86, 0.07, TAG_FOCUS_HUE)),
    // For interfaces with three ink levels.
    'text-secondary': pick(n('700'), n('300')),
    'status-good': pick(good.light, good.dark),
    'status-warning': pick({ ref: 'primitive.warning.600' }, { ref: 'primitive.warning.400' }),
    'status-serious': pick({ ref: 'primitive.serious.600' }, { ref: 'primitive.serious.400' }),
    'status-critical': pick(critical.light, critical.dark),
    // Chart chrome and the de-emphasis tone for "one series is the point".
    'chart-grid': pick(n('200'), n('800')),
    'chart-axis': n('500'),
    // Recedes behind the slots: low chroma, and darker than the orange on dark.
    'chart-neutral': pick(oklch(0.625, 0.015, NEUTRAL_HUE), oklch(0.57, 0.015, NEUTRAL_HUE)),
  };
  // Hover and well on any surface.
  out['surface-hover'] = out['surface-sunken'];
  // The field behind a case hero: colour and grain from the leading pair, quiet in both themes.
  out['atmosphere-a'] = pick({ ref: 'primitive.seq.2' }, a('900'));
  out['atmosphere-b'] = pick({ ref: 'primitive.seq2.2' }, oklch(0.31, 0.045, TAG_FOCUS_HUE));
  out['atmosphere-c'] = pick({ ref: 'primitive.seq.1' }, n('900'));
  chartRefs(mode).forEach((r, i) => (out[`chart-${i + 1}`] = r));
  seqRefs('seq', mode).forEach((r, i) => (out[`seq-${i + 1}`] = r));
  seqRefs('seq2', mode).forEach((r, i) => (out[`seq2-${i + 1}`] = r));
  DIV[mode].neg.forEach((x, i) => (out[`div-neg-${i + 1}`] = x));
  out['div-mid'] = DIV[mode].mid;
  DIV[mode].pos.forEach((x, i) => (out[`div-pos-${i + 1}`] = x));
  // Old names, kept for the sites that still use them.
  for (const k of Object.keys(out)) {
    if (k.startsWith('diagram-')) out[k.replace('diagram-', 'dg-')] = { ref: `c.${k}` };
  }
  out['tag-focus-bg'] = { ref: 'c.tag-cool-bg' };
  out['tag-focus-text'] = { ref: 'c.tag-cool-text' };
  return out;
};

// ---------------------------------------------------------- non-colour scales

const SPACING = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128 };

// Pair with corner-shape: superellipse(2) for smoothing. Chromium only; Safari
// and Firefox fall back to the plain radius, which is the intended degradation.
const RADIUS = { sm: 6, md: 10, lg: 14, xl: 24, full: 999, rule: 2 };

// Px, not ch, so calc() between tracks resolves predictably.
const LAYOUT = {
  measure: 810, 'measure-narrow': 620, wide: 1240, 'page-max': 1280, 'wide-max': 1480,
  gutter: { fluid: 'clamp(1rem, 0.4rem + 2.6vw, 2.5rem)', max: { value: 40, unit: 'px' } },
};

// Display sizes are fluid; body and below are fixed so reading size never moves.
// DTCG dimensions cannot hold clamp(), so $value is the largest size and the CSS
// expression lives in $extensions. One rule decides the family:
//   display marks a BOUNDARY (page title, section break, card title)
//   body marks STRUCTURE inside a component (sub-heads, labels)
//   mono marks DATA (years, IDs, values)
// Motion is for feedback and orientation, never decoration. Smaller things move faster.
//   fast  hover and press
//   base  small things appearing, such as a chart settling in
//   slow  a panel, the largest thing that moves
// Enter on ease-out, which starts fast and settles. Leave on ease-exit, and quicker.
// Two modes, as Carbon has productive and expressive. Dashboards use the three above.
// A portfolio adds these: gentle for hover and reveal for the one opening of a page.
// ease-soft does most of its travel early, so a long duration still answers at once.
const MOTION = { fast: 120, base: 180, slow: 260, gentle: 240, reveal: 900 };
const EASE = { out: [0.23, 1, 0.32, 1], exit: [0.4, 0, 1, 1], standard: [0.2, 0, 0.38, 0.9], soft: [0.16, 1, 0.3, 1] };
const Z = { sticky: 10, panel: 100 };

const TYPE = {
  'display-xl': [{ fluid: 'clamp(2.5rem, 1.5rem + 3.6vw, 4.5rem)', max: 4.5 }, 1.05, -0.02, 'display'],
  display: [{ fluid: 'clamp(2rem, 1.4rem + 2.1vw, 3rem)', max: 3 }, 1.1, -0.015, 'display'],
  h2: [{ fluid: 'clamp(1.5rem, 1.2rem + 1.1vw, 2rem)', max: 2 }, 1.2, -0.01, 'display'],
  h3: [1.375, 1.3, -0.005, 'display'],
  sub: [1.125, 1.4, -0.005, 'body'],
  label: [0.875, 1.4, 0, 'body'],
  'body-lg': [1.125, 1.65, 0, 'body'],
  body: [1, 1.7, 0, 'body'],
  'body-sm': [0.875, 1.6, 0, 'body'],
  caption: [0.8125, 1.5, 0.01, 'body'],
  overline: [0.8125, 1.4, 0.11, 'body'],
  mono: [0.875, 1.6, 0, 'mono'],
};

const FAMILY = {
  display: ['Bitter', 'Georgia', 'serif'],
  body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
  mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
};

// ------------------------------------------------------------------ DTCG shape

const EXT = 'design-system.css';

const color = (hex) => ({
  colorSpace: 'srgb',
  components: hexToRgb(hex).map((c) => Number(c.toFixed(4))),
  hex,
});

const colorToken = (v) => ({ $type: 'color', $value: v.ref ? `{${v.ref}}` : color(v) });
const colorGroup = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, colorToken(v)]));

const px = (v) => ({ $type: 'dimension', $value: { value: v, unit: 'px' } });

const fluidOr = (v) =>
  v.fluid
    ? { $type: 'dimension', $value: v.max, $extensions: { [EXT]: v.fluid } }
    : px(v);

const size = (v) =>
  v.fluid
    ? { $type: 'dimension', $value: { value: v.max, unit: 'rem' }, $extensions: { [EXT]: v.fluid } }
    : { $type: 'dimension', $value: { value: v, unit: 'rem' } };

const numbers = (i) =>
  Object.fromEntries(Object.entries(TYPE).map(([k, row]) => [k, { $type: 'number', $value: row[i] }]));

const steps = (arr) => Object.fromEntries(arr.map((x, i) => [i + 1, x]));

const primitive = {
  primitive: {
    neutral: colorGroup(neutral),
    accent: colorGroup(accent),
    success: colorGroup(success),
    danger: colorGroup(danger),
    warning: colorGroup(warning),
    serious: colorGroup(serious),
    chart: {
      $description: `Categorical slots, in order: ${CATEGORICAL_HUES.join(', ')}.`,
      light: colorGroup(steps(CATEGORICAL.light)),
      dark: colorGroup(steps(CATEGORICAL.dark)),
    },
    seq: colorGroup(steps(seqOrange)),
    seq2: colorGroup(steps(seqTeal)),
  },
};

const scale = {
  font: Object.fromEntries(Object.entries(FAMILY).map(([k, v]) => [k, { $type: 'fontFamily', $value: v }])),
  sp: Object.fromEntries(Object.entries(SPACING).map(([k, v]) => [k, px(v)])),
  radius: Object.fromEntries(Object.entries(RADIUS).map(([k, v]) => [k, px(v)])),
  layout: Object.fromEntries(Object.entries(LAYOUT).map(([k, v]) => [k, fluidOr(v)])),
  text: Object.fromEntries(Object.entries(TYPE).map(([k, row]) => [k, size(row[0])])),
  leading: numbers(1),
  tracking: { $description: 'In em. DTCG dimensions only allow px and rem.', ...numbers(2) },
  motion: Object.fromEntries(Object.entries(MOTION).map(([k, v]) => [k, { $type: 'duration', $value: { value: v, unit: 'ms' } }])),
  ease: Object.fromEntries(Object.entries(EASE).map(([k, v]) => [k, { $type: 'cubicBezier', $value: v }])),
  z: Object.fromEntries(Object.entries(Z).map(([k, v]) => [k, { $type: 'number', $value: v }])),
};

const theme = (mode) => ({ c: colorGroup(semantics(mode)) });

const resolver = {
  $schema: 'https://www.designtokens.org/schemas/2025.10/resolver.json',
  version: '2025.10',
  sets: {
    foundation: { sources: [{ $ref: 'primitive.tokens.json' }, { $ref: 'scale.tokens.json' }] },
  },
  modifiers: {
    theme: {
      default: 'light',
      contexts: {
        light: [{ $ref: 'light.tokens.json' }],
        dark: [{ $ref: 'dark.tokens.json' }],
      },
    },
  },
  resolutionOrder: [{ $ref: '#/sets/foundation' }, { $ref: '#/modifiers/theme' }],
};

mkdirSync(OUT, { recursive: true });
const write = (name, data) => writeFileSync(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n');
write('primitive.tokens.json', primitive);
write('scale.tokens.json', scale);
write('light.tokens.json', theme('light'));
write('dark.tokens.json', theme('dark'));
write('tokens.resolver.json', resolver);
console.log('Wrote DTCG 2025.10 token files to tokens/');
