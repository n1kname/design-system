// Points on a map, counted into hexagons: where things happen most, without a dot for each one.
// The hexagons are pointy-topped and the same size on the ground everywhere on the map (in metres,
// on a flat projection around `origin`), so a busy hexagon is busy, not big.
//
// Each hexagon gets two values from 0 to 1 for drawing, because counts like these are lopsided,
// with a few places that dwarf the rest:
//   rank    the count's place among the distinct counts: the colour. The busiest few always read
//           as hot, and one huge count doesn't turn every other hexagon cold.
//   height  log(count) / log(most): how far it rises in 3D. A log, so one busy cell doesn't
//           flatten the rest.
//
// Pure: no map library. Hand the features to MapLibre (see the components' hexmap.js) or anything
// that draws GeoJSON.
//
//     import { hexbin, hexFeatures } from '@n1kname/charts/hexbin';
//
//     const bins = hexbin(points, { size: 200, origin: [lon, lat] });
//     map.getSource('hexes').setData(hexFeatures(bins));

const M_PER_DEG = 111_320;
// The corners of a pointy-top hexagon, from its centre.
const CORNERS = Array.from({ length: 6 }, (_, i) => ((30 + 60 * i) * Math.PI) / 180);

// Rounds fractional axial coordinates to the hexagon they fall in (cube rounding).
const roundAxial = (q, r) => {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const [dq, dr, ds] = [Math.abs(rq - q), Math.abs(rr - r), Math.abs(rs - s)];
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
};

/** The middle of the points, rounded to a tenth of a degree, so the grid stays put as they change. */
export const centreOf = (points) => {
  const avg = (k) => points.reduce((s, p) => s + p[k], 0) / points.length;
  return [Math.round(avg('lon') * 10) / 10, Math.round(avg('lat') * 10) / 10];
};

// points: [{ lon, lat, count? }], count 1 when missing. size: a hexagon's centre to corner, in
// metres. origin: [lon, lat] the grid is measured from; give a fixed one so the hexagons don't move
// between, say, one year and the next. gap: the share of each hexagon left empty at its edge.
export const hexbin = (points, { size = 200, origin, gap = 0.08 } = {}) => {
  const usable = points.filter((p) => Number.isFinite(p?.lon) && Number.isFinite(p?.lat));
  if (!usable.length) return [];
  const [lon0, lat0] = origin ?? centreOf(usable);
  const latM = M_PER_DEG;
  const lonM = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const bins = new Map();
  for (const p of usable) {
    const mx = (p.lon - lon0) * lonM;
    const my = (p.lat - lat0) * latM;
    const [q, r] = roundAxial(((Math.sqrt(3) / 3) * mx - (1 / 3) * my) / size, ((2 / 3) * my) / size);
    const key = `${q},${r}`;
    const count = p.count ?? 1;
    const bin = bins.get(key);
    if (bin) bin.count += count;
    else bins.set(key, { key, x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r, count });
  }
  const all = [...bins.values()].filter((b) => b.count > 0);
  if (!all.length) return all;
  const maxLog = Math.log1p(Math.max(...all.map((b) => b.count)));
  const distinct = [...new Set(all.map((b) => b.count))].sort((a, b) => a - b);
  const rank = new Map(distinct.map((c, i) => [c, distinct.length === 1 ? 1 : i / (distinct.length - 1)]));
  const drawn = size * (1 - gap);
  for (const b of all) {
    b.rank = rank.get(b.count);
    b.height = Math.log1p(b.count) / maxLog;
    b.centre = [lon0 + b.x / lonM, lat0 + b.y / latM];
    const ring = CORNERS.map((a) => [lon0 + (b.x + drawn * Math.cos(a)) / lonM, lat0 + (b.y + drawn * Math.sin(a)) / latM]);
    b.ring = [...ring, ring[0]];
  }
  return all;
};

/** The hexagons as a GeoJSON FeatureCollection, with count, rank and height on each. */
export const hexFeatures = (bins) => ({
  type: 'FeatureCollection',
  features: bins.map((b) => ({
    type: 'Feature',
    id: b.key,
    geometry: { type: 'Polygon', coordinates: [b.ring] },
    properties: { key: b.key, count: b.count, rank: b.rank, height: b.height },
  })),
});
