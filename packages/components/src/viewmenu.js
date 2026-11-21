// Drives ViewMenu: how the result is shown (sort, period), behind one button that says what's set.
// The panel is a native popover, so a click outside or Escape closes it; this only places it under
// its button and keeps the button's words current.
//
//     import { setViewMenu } from '@n1kname/components/viewmenu.js';
//     setViewMenu(menu, 'Score · 30 days');
//
// The controls inside are the page's own (Segmented, say), each with its label, which becomes its
// caption in the panel; listen to them as usual.

export const setViewMenu = (root, summary) => {
  const out = root.querySelector('[data-vm-summary]');
  if (out && summary !== undefined) out.textContent = summary;
};

export const wireViewMenu = (root) => {
  const button = root.querySelector('[data-vm-button]');
  const panel = root.querySelector('[data-vm-panel]');
  if (!button || !panel) return;

  // A caption over each control from its own name, hidden from screen readers, which already
  // hear the group's label.
  for (const control of [...panel.children]) {
    const name = control.getAttribute('aria-label');
    if (!name || control.previousElementSibling?.classList.contains('vm-caption')) continue;
    const caption = document.createElement('p');
    caption.className = 'vm-caption';
    caption.setAttribute('aria-hidden', 'true');
    caption.textContent = name;
    control.before(caption);
  }

  // Under the button, its right edge on the button's, kept on screen. Placed before it shows
  // (beforetoggle), so it never flashes elsewhere; its width is set in CSS, so it's known then.
  const place = () => {
    const b = button.getBoundingClientRect();
    const w = panel.offsetWidth || Math.min(300, innerWidth - 16);
    const left = Math.max(8, Math.min(b.right - w, innerWidth - w - 8));
    panel.style.top = `${b.bottom + 6}px`;
    panel.style.left = `${left}px`;
  };
  panel.addEventListener('beforetoggle', (e) => {
    if (e.newState !== 'open') return;
    place();
    addEventListener('resize', place);
    addEventListener('scroll', place, { passive: true, capture: true });
  });
  panel.addEventListener('toggle', (e) => {
    const open = e.newState === 'open';
    button.setAttribute('aria-expanded', String(open));
    if (!open) {
      removeEventListener('resize', place);
      removeEventListener('scroll', place, { capture: true });
    }
  });
};
