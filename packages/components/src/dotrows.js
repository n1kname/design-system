// Fills a DotRows after the page has loaded, for data that arrives at runtime.
//
// Each row is { name, tag?, title, dots, right? }. `dots` are { v, color, hollow? }, drawn in
// order, so put the subject last: it lands on top. `title` says every value in words; it is
// what a screen reader hears for the row's marks. `right` is HTML, written as is, so escape
// anything that came from outside.
//
// The scale is [from, to]; values outside it sit at its edge. `ticks` are values on the
// axis, `crowded` the ones a phone leaves out, and `line` a value every row is read against,
// { v, label }, drawn across the rows with its label on the axis.
import { esc } from './datatable.js';

export const setDotRows = (box, { rows, scale, ticks, format = String, crowded = [], line }) => {
  const at = (v) => `${((Math.max(scale[0], Math.min(scale[1], v)) - scale[0]) / (scale[1] - scale[0])) * 100}%`;
  const rule = line ? `<i class="rule" style="left: ${at(line.v)}"></i>` : '';
  box.innerHTML =
    rows
      .map((r) => {
        const vs = r.dots.map((d) => d.v);
        const [lo, hi] = [Math.min(...vs), Math.max(...vs)];
        return (
          '<div class="row">' +
          `<div class="name">${esc(r.name)}${r.tag ? `<span class="tag">${esc(r.tag)}</span>` : ''}</div>` +
          `<div class="track" role="img" aria-label="${esc(r.title)}" title="${esc(r.title)}">${rule}` +
          `<i class="range" style="left: ${at(lo)}; width: calc(${at(hi)} - ${at(lo)})"></i>` +
          r.dots.map((d) => `<i class="dot${d.hollow ? ' hollow' : ''}" style="left: ${at(d.v)}; --dot: ${d.color}"></i>`).join('') +
          '</div>' +
          `<div class="right">${r.right ?? ''}</div>` +
          '</div>'
        );
      })
      .join('') +
    '<div class="row axis" aria-hidden="true"><div></div><div class="ticks">' +
    ticks.map((v) => `<span${crowded.includes(v) ? ' class="crowded"' : ''} style="left: ${at(v)}">${esc(format(v))}</span>`).join('') +
    (line ? `<span class="line-label" style="left: ${at(line.v)}">${esc(line.label)}</span>` : '') +
    '</div></div>';
};
