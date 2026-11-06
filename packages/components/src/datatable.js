// Fills a DataTable after the page has loaded, for data that arrives at runtime. Each row
// is an array of cells: a string or number, or { html, sort, class }. `html` is written as
// is, so escape anything that came from outside.
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const setRows = (table, rows, rowClass = () => '') => {
  const body = table.tBodies[0];
  const head = [...table.tHead.rows[0].cells];
  body.innerHTML = rows
    .map((cells, r) => {
      const tds = cells.map((c, i) => {
        const v = c !== null && typeof c === 'object' ? c : { html: esc(c ?? '–'), sort: c };
        const from = ['left', 'wrap'].filter((c) => head[i]?.classList.contains(c));
        const sort = v.sort === null || v.sort === undefined ? '' : ` data-sort="${esc(v.sort)}"`;
        return `<td class="${[...from, v.class].filter(Boolean).join(' ')}"${sort}>${v.html}</td>`;
      });
      return `<tr class="${rowClass(rows[r], r)}">${tds.join('')}</tr>`;
    })
    .join('');
};

// Sorting: each header button cycles descending, then ascending. Rows without a value stay last.
export const makeSortable = (table) => {
  const heads = [...table.tHead.rows[0].cells];
  heads.forEach((th, i) => {
    const button = th.querySelector('button');
    if (!button) return;
    button.addEventListener('click', () => {
      const dir = th.getAttribute('aria-sort') === 'descending' ? 1 : -1;
      heads.forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
      const val = (tr) => tr.cells[i]?.dataset.sort ?? '';
      const rows = [...table.tBodies[0].rows].sort((a, b) => {
        const [x, y] = [val(a), val(b)];
        if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1;
        const [nx, ny] = [Number(x), Number(y)];
        const order = Number.isNaN(nx) || Number.isNaN(ny) ? x.localeCompare(y) : nx - ny;
        return order * dir;
      });
      table.tBodies[0].append(...rows);
    });
  });
};

// The header from data, for columns known only at runtime (a column per type that appears, say),
// sortable as the built ones are; then setRows as ever. A column is { label, unit?, align?, wrap?,
// sortable? }, as DataTable takes them.
export const setColumns = (table, columns) => {
  const scope = [...table.attributes].find((a) => a.name.startsWith('data-astro-cid'))?.name;
  const s = scope ? ` ${scope}` : '';
  table.tHead.rows[0].innerHTML = columns
    .map((c) => {
      const cls = [c.align === 'left' ? 'left' : '', c.wrap ? 'wrap' : ''].filter(Boolean).join(' ');
      const unit = c.unit ? `<span class="unit"${s}>${esc(c.unit)}</span>` : '';
      const inner = c.sortable === false ? `<span class="plain"${s}>${esc(c.label)}${unit ? ` ${unit}` : ''}</span>` : `<button type="button"${s}>${esc(c.label)}${unit}</button>`;
      return `<th scope="col"${cls ? ` class="${cls}"` : ''}${s}>${inner}</th>`;
    })
    .join('');
  makeSortable(table);
};
