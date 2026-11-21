// Drives FilterSheet: the second rank of filters, in a row where there's room and behind one
// "Filters" button on a phone, which opens them in a bottom sheet. The groups themselves are moved
// into the sheet and back, so the page's own listeners on them (chips-change, segment-change) keep
// working and nothing is rendered twice.
//
//     import { setFilterSheet } from '@n1kname/components/filtersheet.js';
//     setFilterSheet(sheet, { active: 2, done: 'Show 12 jobs' });
//     sheet.addEventListener('filters-clear', () => clearSecondFilters());
//
// `active` is how many of its groups are set, for the button's badge. `done` names what closing
// shows. Fires `filters-clear` from its Clear all.

const PHONE = '(max-width: 639px)';

export const setFilterSheet = (root, { active, done } = {}) => {
  const count = root.querySelector('[data-fs-count]');
  if (count && active !== undefined) {
    count.textContent = active ? String(active) : '';
    count.hidden = !active;
    root.querySelector('[data-fs-open]')?.setAttribute('aria-label', `${root.dataset.label}${active ? `, ${active} set` : ''}`);
  }
  const doneButton = root.querySelector('[data-fs-done]');
  if (doneButton && done) doneButton.textContent = done;
};

export const wireFilterSheet = (root) => {
  const home = root.querySelector('[data-fs-home]');
  const sheet = root.querySelector('[data-fs-sheet]');
  const body = root.querySelector('[data-fs-body]');
  if (!home || !sheet || !body) return;
  let groups = [];

  // Each group gets a caption from its own name in the sheet, where there's no row to give context.
  const open = () => {
    groups = [...home.children];
    body.replaceChildren(
      ...groups.map((g) => {
        const section = document.createElement('section');
        section.className = 'fs-section';
        const name = g.getAttribute('aria-label');
        if (name) {
          const caption = document.createElement('p');
          caption.className = 'fs-caption';
          caption.setAttribute('aria-hidden', 'true');
          caption.textContent = name;
          section.append(caption);
        }
        section.append(g);
        return section;
      }),
    );
    sheet.showModal();
    root.querySelector('[data-fs-open]')?.setAttribute('aria-expanded', 'true');
  };

  const restore = () => {
    home.append(...groups);
    body.replaceChildren();
    root.querySelector('[data-fs-open]')?.setAttribute('aria-expanded', 'false');
  };

  root.querySelector('[data-fs-open]')?.addEventListener('click', open);
  root.querySelector('[data-fs-done]')?.addEventListener('click', () => sheet.close());
  root.querySelector('[data-fs-clear]')?.addEventListener('click', () => root.dispatchEvent(new CustomEvent('filters-clear')));
  // A tap on the dimmed page behind the sheet closes it, as Escape does.
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', restore);
  // Turned to landscape or widened past the phone layout: the row is back, so the sheet goes.
  matchMedia(PHONE).addEventListener('change', (e) => { if (!e.matches && sheet.open) sheet.close(); });
};
