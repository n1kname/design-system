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
