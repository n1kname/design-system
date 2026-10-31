// Ranked bars: one value per category, read on a shared baseline. Reach for this
// over a donut when values are close or there are more than six.

import { Plot, renderResponsive } from './plot.mjs';
import { chrome } from './theme.mjs';

const fill = (d) => d.color ?? chrome.neutral;
const value = (d) => d.valueLabel ?? d.value;

// The input order is kept, so sort first if you want the largest on top.
export const rankedBars = (data) => {
  const domain = data.map((d) => d.label);
  const max = Math.max(...data.map((d) => d.value));
  const style = {
    background: 'transparent',
    color: chrome.text,
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    overflow: 'visible',
  };
  const number = { fontFamily: 'var(--font-mono)', fill: chrome.text };
  return renderResponsive((_, narrow) =>
    narrow
      ? {
          // Labels sit above their bars: beside them, they would leave no room to draw.
          style,
          height: data.length * 48,
          marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 44,
          x: { axis: null, domain: [0, max] },
          y: { axis: null, domain },
          marks: [
            Plot.barX(data, { y: 'label', x: 'value', fill, insetTop: 28, insetBottom: 4, rx2: 4 }),
            Plot.text(data, { y: 'label', x: 0, text: 'label', textAnchor: 'start', dy: -10, fill: chrome.text }),
            Plot.text(data, { y: 'label', x: 'value', text: value, textAnchor: 'start', dx: 8, dy: 12, ...number }),
          ],
        }
      : {
          style,
          height: data.length * 34 + 8,
          marginTop: 4, marginBottom: 4, marginLeft: 372, marginRight: 48,
          x: { axis: null, domain: [0, max] },
          y: { label: null, domain, tickSize: 0 },
          marks: [
            Plot.axisY({ tickSize: 0, label: null, lineWidth: 60 }),
            Plot.barX(data, { y: 'label', x: 'value', fill, insetTop: 6, insetBottom: 6, rx2: 4 }),
            Plot.ruleX([0], { stroke: chrome.axis }),
            Plot.text(data, { y: 'label', x: 'value', text: value, textAnchor: 'start', dx: 8, ...number }),
          ],
        },
  );
};
