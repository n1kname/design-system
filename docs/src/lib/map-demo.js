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

// ── Cells: hexagons of counts, from a few warm spots ──────────────────────────

const SIZE = 0.0018;
const DRAWN = SIZE * 0.92;
const CORNERS = Array.from({ length: 6 }, (_, i) => ((30 + 60 * i) * Math.PI) / 180);

/**
 * Pointy-top hexagons with a count each, summed from a few spots, and two values from 0 to 1 for
 * the map: `rank`, the count's place among the distinct counts (the colour), and `height`,
 * log(count) / log(max), so one busy cell doesn't flatten the rest.
 */
export const cells = (seed = 5) => {
  const r = random(seed);
  const spots = Array.from({ length: 5 }, () => ({ x: (r() - 0.5) * 0.05, y: (r() - 0.5) * 0.035, s: 0.004 + r() * 0.006, a: 40 + r() * 400 }));
  const out = [];
  for (let q = -16; q <= 16; q++)
    for (let rr = -12; rr <= 12; rr++) {
      const x = SIZE * Math.sqrt(3) * (q + rr / 2);
      const y = SIZE * 1.5 * rr;
      let count = 0;
      for (const p of spots) count += p.a * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (2 * p.s ** 2));
      count = Math.round(count * (0.6 + r() * 0.8));
      if (count >= 1) out.push({ x, y, count });
    }
  const max = Math.log1p(Math.max(...out.map((c) => c.count)));
  const unique = [...new Set(out.map((c) => c.count))].sort((a, b) => a - b);
  const rank = new Map(unique.map((n, i) => [n, unique.length === 1 ? 1 : i / (unique.length - 1)]));
  return {
    type: 'FeatureCollection',
    features: out.map((c) => {
      const ring = CORNERS.map((a) => [+(c.x + DRAWN * Math.cos(a)).toFixed(6), +(c.y + DRAWN * Math.sin(a)).toFixed(6)]);
      return {
        type: 'Feature',
        properties: { count: c.count, rank: rank.get(c.count), height: Math.log1p(c.count) / max },
        geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
      };
    }),
  };
};
