// Fills a RangeBars after the page has loaded, for data that arrives at runtime.
//
// Each row is { name, value, lo, hi, color, title, right?, rest? }: a bar to `value` with the
// range the figure could fall in, `lo` to `hi`, drawn over it. `title` says every value in
// words; it is what a screen reader hears for the row's bar. `right` is HTML, written as is,
// so escape anything that came from outside. A `rest` row, such as everything no row
// explains, sits under a rule at the bottom.
//
// Widths are shares of `max`, which by default is a little past the highest `hi`, so every
// range ends inside the track.
import { esc } from './datatable.js';

export const setRangeBars = (box, { rows, max = Math.max(...rows.map((r) => r.hi)) * 1.02 }) => {
  const w = (v) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  box.innerHTML = rows
    .map(
      (r) =>
        `<div class="row${r.rest ? ' rest' : ''}">` +
        `<div class="name">${esc(r.name)}</div>` +
        `<div class="track" role="img" aria-label="${esc(r.title)}" title="${esc(r.title)}">` +
        `<i class="amount" style="width: ${w(r.value)}; background: ${r.color}"></i>` +
        `<i class="span" style="left: ${w(r.lo)}; width: calc(${w(r.hi)} - ${w(r.lo)})"></i>` +
        `<i class="cap" style="left: ${w(r.lo)}"></i><i class="cap" style="left: ${w(r.hi)}"></i>` +
        '</div>' +
        `<div class="right">${r.right ?? ''}</div>` +
        '</div>',
    )
    .join('');
};
