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

  // 8px under the button, its right edge on the button's, kept on screen. Placed by its right
  // edge before it shows (beforetoggle), so it never flashes elsewhere, since its width follows its
  // controls and isn't known until then. Once shown, if it would run off the left, it moves in.
  const place = () => {
    const b = button.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    panel.style.top = `${b.bottom + 8}px`;
    panel.style.left = 'auto';
    panel.style.right = `${Math.max(8, vw - b.right)}px`;
    if (panel.matches(':popover-open') && panel.getBoundingClientRect().left < 8) {
      panel.style.right = 'auto';
      panel.style.left = '8px';
    }
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
    if (open) place();
    if (!open) {
      removeEventListener('resize', place);
      removeEventListener('scroll', place, { capture: true });
    }
  });
};
