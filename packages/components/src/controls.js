// Drives Toast, and writes IconButton markup for rows made at runtime.
//
//     import { showToast, iconButtonHTML } from '@n1kname/components/controls.js';
//     showToast('Removed', { action: 'Undo', onAction: () => restore(id) });
//     cell.innerHTML = iconButtonHTML({ icon: 'heart', label: 'Favourite', pressed: false });
import { ICONS } from './icons';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const iconButtonHTML = ({ icon, label, pressed, size = 18, attrs = '' }) =>
  `<button type="button" class="icon-button" aria-label="${esc(label)}" title="${esc(label)}"` +
  `${pressed === undefined ? '' : ` aria-pressed="${pressed}"`}${attrs ? ` ${attrs}` : ''}>` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${size < 20 ? 1.75 : 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[icon] ?? ''}</svg></button>`;

let timer;
export const showToast = (text, { action, onAction, timeout = 5000 } = {}) => {
  const root = document.querySelector('[data-toast]');
  if (!root) return;
  const button = root.querySelector('button');
  root.querySelector('.toast-text').textContent = text;
  button.hidden = !action;
  button.textContent = action ?? '';
  button.onclick = () => {
    hide();
    onAction?.();
  };
  const hide = () => {
    clearTimeout(timer);
    root.hidden = true;
  };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(hide, timeout);
  };
  // Stays while someone is on it, so Undo can't vanish under the pointer.
  root.onpointerenter = root.onfocusin = () => clearTimeout(timer);
  root.onpointerleave = root.onfocusout = arm;
  root.hidden = false;
  arm();
  return hide;
};
