// What a map in a MapStage needs from script: which message covers it, the room its floating panels
// leave, side panels put away and brought back, and tokens resolved for a canvas. None of it
// imports a map library: it hands back plain values MapLibre takes as they are.

/** The heat ramp, cold to warm, as tokens. The same in both themes. */
export const HEAT = [1, 2, 3, 4, 5, 6].map((i) => `var(--c-heat-${i})`);

/**
 * A canvas reads colours, not tokens: a token (or any CSS colour), resolved now, as rgb(). Call it
 * again when the theme changes (onTheme).
 */
export const resolve = (value) => {
  const probe = document.createElement('i');
  probe.style.color = value;
  probe.hidden = true;
  document.body.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
};

/** Calls fn when the theme changes, by the switch (data-theme) or by the system. */
export const onTheme = (fn) => {
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
};

/**
 * A MapLibre expression that colours a feature by a number from 0 to 1 in `property`, along the
 * heat ramp or any list of colours: ['interpolate', ['linear'], ['get', property], 0, …, 1, …].
 * The colours are resolved now; build it again when the theme changes.
 */
export const ramp = (property, colours = HEAT) => [
  'interpolate',
  ['linear'],
  ['get', property],
  ...colours.flatMap((c, i) => [i / (colours.length - 1), resolve(c)]),
];

/**
 * Which message covers the map: 'loading' (and the map dims), 'empty', 'failed', or 'ready' for
 * none. A message the MapStage wasn't given is skipped.
 */
export const setStage = (stage, state) => {
  const root = stage.closest('[data-map-stage]') ?? stage;
  root.toggleAttribute('data-loading', state === 'loading');
  root.querySelectorAll('[data-over]').forEach((p) => (p.hidden = p.dataset.over !== state));
};

/**
 * Padding for fitBounds and easeTo, so what the map shows stays clear of the panels floating over
 * it: under a floating title (MapStage fill mode) and a top panel, above a bottom one, left of a
 * side panel while it floats. `edge` is the
 * least on every side; `gap` the room kept from a panel. Each axis keeps at least a fifth of the map.
 */
export const room = (stage, { edge = 48, gap = 16 } = {}) => {
  const root = stage.closest('[data-map-stage]') ?? stage;
  const frame = root.querySelector('.frame').getBoundingClientRect();
  const pad = { top: edge, right: edge, bottom: edge, left: edge };
  const head = root.querySelector(':scope > .head');
  if (head && getComputedStyle(head).position === 'absolute') pad.top = Math.max(pad.top, head.getBoundingClientRect().bottom - frame.top + gap);
  for (const panel of root.querySelectorAll('[data-float]')) {
    const style = getComputedStyle(panel);
    if (style.position !== 'absolute' || style.display === 'none') continue;
    const r = panel.getBoundingClientRect();
    const place = panel.dataset.float;
    if (place === 'side') pad.right = Math.max(pad.right, frame.right - r.left + gap);
    else if (place.startsWith('top') || place === 'head') pad.top = Math.max(pad.top, r.bottom - frame.top + gap);
    else pad.bottom = Math.max(pad.bottom, frame.bottom - r.top + gap);
  }
  const fit = (a, b, size) => {
    const most = size * 0.8;
    if (pad[a] + pad[b] <= most) return;
    const k = most / (pad[a] + pad[b]);
    pad[a] = Math.floor(pad[a] * k);
    pad[b] = Math.floor(pad[b] * k);
  };
  fit('top', 'bottom', frame.height);
  fit('left', 'right', frame.width);
  return pad;
};

/**
 * Wires every FloatToggle on the page once: it opens and closes its side panel, and the panel fires
 * `float-toggle` with { open }. FloatPanel calls it; call it again after adding toggles from script.
 */
export const wireFloatToggles = (root = document) => {
  root.querySelectorAll('[data-float-toggle]:not([data-wired])').forEach((button) => {
    button.dataset.wired = '';
    const panel = document.getElementById(button.dataset.floatToggle);
    if (!panel) return;
    panel.toggleAttribute('data-closed', button.getAttribute('aria-expanded') !== 'true');
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('data-closed', !open);
      panel.dispatchEvent(new CustomEvent('float-toggle', { bubbles: true, detail: { open } }));
    });
  });
};
