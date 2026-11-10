// The map demos' ground and data. Synthetic, from a fixed seed, on no real place: the map is a
// plain ground with a grid of lines, around 0° 0° in open sea, with no basemap or tiles to fetch.
// A real page brings its own basemap style.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { onTheme, resolve } from '@n1kname/components/mapstage.js';

const random = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const CENTER = [0, 0];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Grid lines every 0.005°, about half a kilometre, well past what the demos show.
const grid = () => {
  const lines = [];
  for (let i = -60; i <= 60; i++) {
    const v = i / 200;
    lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[v, -0.3], [v, 0.3]] } });
    lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[-0.3, v], [0.3, v]] } });
  }
  return { type: 'FeatureCollection', features: lines };
};

const ground = () => ({
  version: 8,
  sources: { grid: { type: 'geojson', data: grid() } },
  layers: [
    { id: 'ground', type: 'background', paint: { 'background-color': resolve('var(--c-surface-sunken)') } },
    { id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': resolve('var(--c-border)'), 'line-width': 1 } },
  ],
});

/**
 * A map on the plain ground in `box`, or null where it can't start (no WebGL). `layers(map)` adds
 * the demo's own; `repaint(map)` gives them the theme's colours again when it changes.
 */
export const groundMap = (box, { zoom = 12, layers, repaint, ...options } = {}) => {
  let map;
  try {
    map = new maplibregl.Map({ container: box, style: ground(), center: CENTER, zoom, attributionControl: false, ...options });
  } catch {
    return null;
  }
  new ResizeObserver(() => map.resize()).observe(box);
  map.on('load', () => layers?.(map));
  onTheme(() => {
    if (!map.isStyleLoaded()) return;
    map.setPaintProperty('ground', 'background-color', resolve('var(--c-surface-sunken)'));
    map.setPaintProperty('grid', 'line-color', resolve('var(--c-border)'));
    repaint?.(map);
  });
  return map;
};

export { maplibregl };

// ── Routes: random walks, each a kind of movement ─────────────────────────────

export const KINDS = [
  { key: 'walking', label: 'Walking', color: 'var(--c-chart-5)' },
  { key: 'cycling', label: 'Cycling', color: 'var(--c-chart-3)' },
  { key: 'running', label: 'Running', color: 'var(--c-chart-1)' },
];

export const routes = (seed = 3, count = 14) => {
  const r = random(seed);
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, n) => {
      const kind = KINDS[n % KINDS.length];
      const stride = kind.key === 'cycling' ? 0.0008 : 0.0004;
      let [x, y] = [(r() - 0.5) * 0.02, (r() - 0.5) * 0.015];
      let heading = r() * Math.PI * 2;
      const points = [[x, y]];
      for (let i = 0; i < 40 + r() * 40; i++) {
        heading += (r() - 0.5) * 0.9;
        x += Math.cos(heading) * stride;
        y += Math.sin(heading) * stride;
        points.push([+x.toFixed(5), +y.toFixed(5)]);
      }
      return { type: 'Feature', properties: { kind: kind.key }, geometry: { type: 'LineString', coordinates: points } };
    }),
  };
};

export const bounds = (data) => {
  const b = new maplibregl.LngLatBounds();
  for (const f of data.features) for (const p of f.geometry.coordinates.flat(f.geometry.type === 'Polygon' ? 1 : 0)) b.extend(p);
  return b;
};

export const kindColour = () => ['match', ['get', 'kind'], ...KINDS.flatMap((k) => [k.key, resolve(k.color)]), resolve('var(--c-chart-neutral)')];

// ── Points: counts around a few warm spots, for @n1kname/charts/hexbin ────────

/** Synthetic points with a count each, scattered around a few spots near 0° 0°. */
export const points = (seed = 5, n = 2400) => {
  const r = random(seed);
  const spots = Array.from({ length: 5 }, () => ({ x: (r() - 0.5) * 0.05, y: (r() - 0.5) * 0.035, s: 0.003 + r() * 0.005, w: 0.3 + r() }));
  const total = spots.reduce((t, p) => t + p.w, 0);
  // A normal draw (Box–Muller), for points that thin out from each spot.
  const normal = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  return Array.from({ length: n }, () => {
    let pick = r() * total;
    const spot = spots.find((p) => (pick -= p.w) <= 0) ?? spots[0];
    return { lon: +(spot.x + normal() * spot.s).toFixed(5), lat: +(spot.y + normal() * spot.s).toFixed(5), count: 1 + Math.floor(r() * 4) };
  });
};
