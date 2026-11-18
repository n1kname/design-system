/**
 * Background patterns for coloured panels (CaseTile, ScreenStack): a small SVG tile, drawn in white
 * for a deep tone or black for a light one, at low opacity. Each is a single image, so a component
 * can put it on its own layer and fade it with a mask.
 *
 * dots   a dot every 22px, the default
 * grid   a hairline grid at 32px
 * lines  diagonal hairlines, 12px apart
 * plus   small plus marks at 28px, like registration marks
 * waves  soft horizontal waves
 * none   no pattern, the gradient alone
 */
export const PATTERNS = ['dots', 'grid', 'lines', 'plus', 'waves', 'none'] as const;
export type Pattern = (typeof PATTERNS)[number];

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

export const pattern = (name: Pattern = 'dots', ink: 'light' | 'dark' = 'light') => {
  const c = ink === 'dark' ? '#000' : '#fff';
  const o = (light: number, dark: number) => (ink === 'dark' ? dark : light);
  switch (name) {
    case 'grid':
      return { image: svg(32, 32, `<path d='M32 .5H.5V32' fill='none' stroke='${c}' stroke-opacity='${o(0.11, 0.08)}'/>`), size: '32px 32px' };
    case 'lines':
      return { image: svg(12, 12, `<path d='M-3 3 3-3M0 12 12 0M9 15l6-6' stroke='${c}' stroke-opacity='${o(0.1, 0.07)}'/>`), size: '12px 12px' };
    case 'plus':
      return { image: svg(28, 28, `<path d='M14 10.5v7M10.5 14h7' stroke='${c}' stroke-opacity='${o(0.22, 0.14)}' stroke-linecap='round'/>`), size: '28px 28px' };
    case 'waves':
      return { image: svg(96, 20, `<path d='M0 10c16-8 32-8 48 0s32 8 48 0' fill='none' stroke='${c}' stroke-opacity='${o(0.12, 0.08)}'/>`), size: '96px 20px' };
    case 'none':
      return { image: 'none', size: 'auto' };
    default:
      return { image: svg(22, 22, `<circle cx='1' cy='1' r='1' fill='${c}' fill-opacity='${o(0.16, 0.11)}'/>`), size: '22px 22px' };
  }
};

/** The inline custom properties a component sets on its root for its pattern layer. */
export const patternStyle = (name?: Pattern, ink?: 'light' | 'dark') => {
  const p = pattern(name, ink);
  return `--pattern-image: ${p.image}; --pattern-size: ${p.size};`;
};
