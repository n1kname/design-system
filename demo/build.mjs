// Builds one static page: every palette on a chart, in both themes, from synthetic
// data. The charts are SVG strings by the time the page loads; the only script is
// the theme toggle.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import {
  Plot, categorical, chrome, diverging, donutRing, grid as gridLines, renderPlot, sequential, swatch,
} from '@ds/charts';
import { SERIES, STACK, deltas, grid, lines, shares, stack } from './data.mjs';

const require = createRequire(import.meta.url);
const out = new URL('./dist/', import.meta.url);
mkdirSync(new URL('fonts/', out), { recursive: true });

copyFileSync(require.resolve('@ds/tokens/tokens.css'), new URL('tokens.css', out));
const fonts = [
  ['@fontsource/ibm-plex-sans/package.json', 'ibm-plex-sans-latin-400-normal.woff2', 'IBM Plex Sans', 400],
  ['@fontsource/ibm-plex-sans/package.json', 'ibm-plex-sans-latin-600-normal.woff2', 'IBM Plex Sans', 600],
  ['@fontsource/ibm-plex-mono/package.json', 'ibm-plex-mono-latin-400-normal.woff2', 'IBM Plex Mono', 400],
  ['@fontsource-variable/bitter/package.json', 'bitter-latin-wght-normal.woff2', 'Bitter', '100 900'],
];
const fontCss = fonts
  .map(([pkg, file, family, weight]) => {
    copyFileSync(join(dirname(require.resolve(pkg)), 'files', file), new URL(`fonts/${file}`, out));
    return `@font-face{font-family:'${family}';font-weight:${weight};font-display:swap;src:url(fonts/${file}) format('woff2')}`;
  })
  .join('\n');

const width = 720;
const axisColor = chrome.axis;
const seriesDomain = (names) => ({ domain: names, range: categorical.slice(0, names.length) });

const lineChart = renderPlot({
  width, height: 280, marginRight: 64,
  x: { label: 'Week', line: true, tickSize: 0 },
  y: { label: 'Index', grid: false, tickSize: 0 },
  color: seriesDomain(SERIES),
  marks: [
    gridLines('y'),
    Plot.ruleX([1], { stroke: axisColor }),
    Plot.lineY(lines, { x: 'week', y: 'y', stroke: 'series', strokeWidth: 2 }),
    Plot.dot(lines, Plot.selectLast({ x: 'week', y: 'y', z: 'series', fill: 'series', r: 4, stroke: 'var(--c-surface)', strokeWidth: 2 })),
    Plot.text(lines, Plot.selectLast({ x: 'week', y: 'y', z: 'series', text: 'series', dx: 10, textAnchor: 'start', fill: chrome.text })),
  ],
});

const stackChart = renderPlot({
  width, height: 250, marginLeft: 36, marginBottom: 48,
  x: { label: 'Share of total', labelOffset: 44, grid: false, tickSize: 0, percent: true },
  y: { label: null, tickSize: 0 },
  color: seriesDomain(STACK),
  marks: [
    Plot.barX(stack, Plot.stackX({ offset: 'normalize', order: null, x: 'value', y: 'period', fill: 'series', stroke: 'var(--c-surface)', strokeWidth: 2 })),
    Plot.ruleX([0], { stroke: axisColor }),
  ],
});

const thresholds = [20, 35, 50, 65, 80, 95];
const heatmap = renderPlot({
  width, height: 250, marginLeft: 44, marginBottom: 48,
  padding: 0.06,
  x: { label: 'Hour', labelOffset: 44, tickSize: 0, interval: 1, ticks: [0, 6, 12, 18, 23] },
  y: { label: null, tickSize: 0, domain: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  color: { type: 'threshold', domain: thresholds, range: sequential },
  marks: [Plot.cell(grid, { x: 'hour', y: 'day', fill: 'value' })],
});

const divergeChart = renderPlot({
  width, height: 250, marginBottom: 48,
  x: { label: 'Month', labelOffset: 44, tickSize: 0, interval: 1, ticks: [1, 3, 5, 7, 9, 11] },
  y: { label: 'Against the baseline', grid: false, tickSize: 0 },
  color: { type: 'threshold', domain: [-12, -6, -2, 2, 6, 12], range: diverging },
  marks: [
    gridLines('y'),
    Plot.barY(deltas, { x: 'month', y: 'delta', fill: 'delta', insetLeft: 8, insetRight: 8, rx: 2 }),
    Plot.ruleY([0], { stroke: axisColor }),
  ],
});

const donutData = shares.map((d, i) => ({ ...d, valueLabel: `${d.value}%`, color: i < 2 ? categorical[0] : undefined, strong: i < 2 }));
const donut = donutRing(donutData, { title: ['Fictional', 'shares'] });
const donutList = donutData
  .map((d) => `<li class="${d.strong ? 'strong' : ''}"><i style="background:${swatch(d)}"></i><span>${d.label}</span><b>${d.valueLabel}</b></li>`)
  .join('');

const legend = (names) =>
  `<ul class="legend">${names.map((n, i) => `<li><i style="background:${categorical[i]}"></i>${n}</li>`).join('')}</ul>`;

const ramp = (steps, labels) =>
  `<ul class="ramp">${steps.map((c, i) => `<li><i style="background:${c}"></i>${labels?.[i] ?? ''}</li>`).join('')}</ul>`;

const table = (rows, cols, caption) => `<details><summary>${caption}</summary><table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${r[c]}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chart palette</title>
<link rel="stylesheet" href="tokens.css">
<style>
${fontCss}
body{margin:0;background:var(--c-bg);color:var(--c-text);font:var(--text-body)/var(--leading-body) var(--font-body)}
main{max-width:800px;margin:auto;padding:var(--sp-7) var(--layout-gutter)}
h1{font:600 var(--text-display)/var(--leading-display) var(--font-display);letter-spacing:var(--tracking-display);margin:0 0 var(--sp-3)}
h2{font:600 var(--text-h3)/var(--leading-h3) var(--font-display);margin:0 0 var(--sp-2)}
p{color:var(--c-text-secondary);margin:0 0 var(--sp-4)}
section{background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius-lg);padding:var(--sp-5);margin-block:var(--sp-5);overflow:hidden}
svg{max-width:100%;height:auto;display:block}
ul{list-style:none;margin:0;padding:0}
i{display:inline-block;border-radius:3px}
.legend{display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-4);margin-bottom:var(--sp-3);font-size:var(--text-body-sm)}
.legend li{display:flex;align-items:center;gap:var(--sp-2)}.legend i{width:12px;height:12px}
.ramp{display:flex;gap:2px;margin-top:var(--sp-3);font:var(--text-caption) var(--font-mono);color:var(--c-text-muted)}
.ramp li{flex:1}.ramp i{display:block;height:16px;margin-bottom:var(--sp-1)}
.donut{display:flex;gap:var(--sp-6);align-items:center;flex-wrap:wrap}.donut>div{flex:0 0 240px}.donut ul{flex:1;min-width:200px;display:grid;gap:var(--sp-2);font-size:var(--text-body-sm)}
.donut li{display:grid;grid-template-columns:12px 1fr auto;gap:var(--sp-3);align-items:center}.donut li i{width:12px;height:12px}.donut li b{font:var(--text-mono) var(--font-mono)}.donut li.strong{font-weight:600}
details{margin-top:var(--sp-3);font-size:var(--text-body-sm);color:var(--c-text-muted)}
table{border-collapse:collapse;margin-top:var(--sp-2);font:var(--text-mono) var(--font-mono);color:var(--c-text)}th,td{padding:2px 12px 2px 0;text-align:left;border-bottom:1px solid var(--c-border)}
button{font:inherit;color:var(--c-text);background:var(--c-surface);border:1px solid var(--c-border-strong);border-radius:var(--radius-sm);padding:var(--sp-1) var(--sp-3);cursor:pointer}
button:focus-visible{outline:2px solid var(--c-focus);outline-offset:2px}
</style>
</head>
<body>
<main>
<h1>Chart palette</h1>
<p>Every palette in use, on synthetic data. Tokens only: the charts below hold no hex values and switch theme with no script of their own.</p>
<button type="button" id="theme">Switch theme</button>
<section><h2>Categorical: three series</h2><p>Direct labels on the lines, and a legend. The first three slots are safe for any chart form.</p>${legend(SERIES)}${lineChart}${table(lines.filter((d) => d.week % 6 === 0), ['week', 'series', 'y'], 'Table: every sixth week')}</section>
<section><h2>Categorical: all eight slots</h2><p>A stack only has neighbours touching. A ninth series folds into Other.</p>${legend(STACK)}${stackChart}</section>
<section><h2>Emphasis</h2><p>When two values are the point: one slot and the neutral tone. A donut is for part-to-whole only.</p><div class="donut"><div>${donut}</div><ul>${donutList}</ul></div></section>
<section><h2>Sequential</h2><p>One hue. Step 1 means little and recedes into the surface, in both themes.</p>${heatmap}${ramp(sequential, ['<20', '20', '35', '50', '65', '80', '95+'])}</section>
<section><h2>Diverging</h2><p>Two hues around a midpoint with almost no chroma.</p>${divergeChart}${ramp(diverging, ['<-12', '-12', '-6', '-2 to 2', '2', '6', '12+'])}${table(deltas, ['month', 'delta'], 'Table: every month')}</section>
</main>
<script>
const root = document.documentElement;
document.getElementById('theme').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
});
</script>
</body>
</html>
`;
writeFileSync(new URL('index.html', out), page);
console.log(`Demo: ${new URL('index.html', out).pathname} (${(page.length / 1024).toFixed(0)} KB)`);
