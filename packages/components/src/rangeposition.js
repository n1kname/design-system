// Drives RangePosition: where one value sits in its range. A track, a band from the period's low
// to its high, a dot for the value and a dashed tick for a reference such as a target, with the
// low and high under the band's ends and a key that names the dot and the tick in words. The same
// markup at build time (RangePosition's props) and at runtime (setRangePosition).
//
//     import { setRangePosition } from '@n1kname/components/rangeposition.js';
//     setRangePosition(box, { low: 2399, high: 2649, value: 2449, reference: 2420, format: euro, tone: undefined });
//
// Options: { low, high, value, reference?, format?, valueLabel?, referenceLabel?, rangeLabel?,
// tone?: 'good' }. `format` turns a number into its words ("€2.449"); text is escaped. The scale
// runs from the lowest to the highest of the four, so a value or target outside the band still
// shows. tone 'good' turns the dot the status green, for a value in the person's favour; the key
// and the label still say it.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clamp = (v) => Math.max(0, Math.min(100, v));

export const rangePositionHTML = ({
  low,
  high,
  value,
  reference = null,
  format = (v) => String(v),
  valueLabel = 'Today',
  referenceLabel = 'Target',
  rangeLabel = 'Range',
  tone,
} = {}) => {
  const has = (v) => typeof v === 'number' && Number.isFinite(v);
  if (!has(low) || !has(high)) return '';
  const ends = [low, high, value, reference].filter(has);
  const min = Math.min(...ends);
  const max = Math.max(...ends);
  const span = max - min || 1;
  const at = (v) => clamp(((v - min) / span) * 100);
  const f = (v) => esc(format(v));
  const said = [
    has(value) ? `${valueLabel} ${format(value)}.` : '',
    `${rangeLabel} ${format(low)} to ${format(high)}.`,
    has(reference) ? `${referenceLabel} ${format(reference)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const good = tone === 'good' ? ' good' : '';
  return (
    `<div class="rp" role="img" aria-label="${esc(said)}">` +
    `<div class="rp-scale" aria-hidden="true">` +
    `<span class="rp-track"></span>` +
    `<span class="rp-band" style="left:${at(low)}%;width:${at(high) - at(low)}%"></span>` +
    (has(reference) ? `<span class="rp-ref" style="left:${at(reference)}%"></span>` : '') +
    (has(value) ? `<span class="rp-dot${good}" style="left:${at(value)}%"></span>` : '') +
    `</div>` +
    `<div class="rp-ends" aria-hidden="true" style="padding-inline:${at(low)}% ${100 - at(high)}%"><span>${f(low)}</span><span>${f(high)}</span></div>` +
    `<p class="rp-key" aria-hidden="true">` +
    (has(value) ? `<span class="rp-key-item"><span class="rp-key-dot${good}"></span>${esc(valueLabel)} ${f(value)}</span>` : '') +
    (has(reference) ? `<span class="rp-key-item"><span class="rp-key-ref"></span>${esc(referenceLabel)} ${f(reference)}</span>` : '') +
    `</p>` +
    `</div>`
  );
};

/** Fills a RangePosition (or any box) at runtime. */
export const setRangePosition = (box, opts) => {
  box.innerHTML = rangePositionHTML(opts);
};
