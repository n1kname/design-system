// Charts name tokens, never hex, so a chart follows the theme toggle by CSS
// alone and needs no JavaScript at runtime.

const v = (name) => `var(--c-${name})`;

export const categorical = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`chart-${i}`));
export const sequential = [1, 2, 3, 4, 5, 6, 7].map((i) => v(`seq-${i}`));
export const sequential2 = [1, 2, 3, 4, 5, 6, 7].map((i) => v(`seq2-${i}`));
export const diverging = [
  v('div-neg-3'), v('div-neg-2'), v('div-neg-1'), v('div-mid'),
  v('div-pos-1'), v('div-pos-2'), v('div-pos-3'),
];

export const chrome = {
  grid: v('chart-grid'),
  axis: v('chart-axis'),
  neutral: v('chart-neutral'),
  text: v('text'),
  textMuted: v('text-muted'),
};

// Plot's own tooltip, for charts drawn at build time: in a system font, because Safari misplaces
// centred SVG text in a web font. A chart drawn in the page can say it better with `pointer`
// (./pointer.mjs): an HTML card in the page's type that glides. Every value also needs a table.
export const tipStyle = {
  fill: 'var(--c-surface)',
  stroke: 'var(--c-border-strong)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  textPadding: 8,
};
