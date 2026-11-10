// Synthetic points only, around 0° 0° in open sea.
import assert from 'node:assert/strict';
import { centreOf, hexbin, hexFeatures } from './hexbin.mjs';

assert.deepEqual(hexbin([]), []);
assert.deepEqual(hexbin([{ lon: NaN, lat: 0 }]), [], 'unusable points are skipped');

// Points within a few metres share a hexagon; their counts add up.
const near = hexbin([{ lon: 0, lat: 0, count: 3 }, { lon: 0.00001, lat: 0.00001, count: 2 }, { lon: 0, lat: 0 }], { origin: [0, 0] });
assert.equal(near.length, 1);
assert.equal(near[0].count, 6, 'counts add, a missing count is one');

// A point a kilometre away is another hexagon.
const apart = hexbin([{ lon: 0, lat: 0 }, { lon: 0.01, lat: 0 }], { origin: [0, 0], size: 200 });
assert.equal(apart.length, 2);

// Rank by distinct counts: the busiest is 1, the quietest 0, ties share a rank.
const spread = hexbin(
  [
    { lon: 0, lat: 0, count: 1 },
    { lon: 0.01, lat: 0, count: 1 },
    { lon: 0.02, lat: 0, count: 10 },
    { lon: 0.03, lat: 0, count: 10000 },
  ],
  { origin: [0, 0] },
);
const by = Object.fromEntries(spread.map((b) => [b.count, b]));
assert.equal(by[1].rank, 0);
assert.equal(by[10].rank, 0.5, 'the middle count is half, however far below the top');
assert.equal(by[10000].rank, 1);
assert.equal(by[10000].height, 1);
assert.ok(by[10].height > 0.2, 'log height: 10 against 10,000 still rises');
assert.equal(hexbin([{ lon: 0, lat: 0, count: 4 }], { origin: [0, 0] })[0].rank, 1, 'one count alone is hot');

// The grid is fixed by its origin: the same point lands in the same hexagon with other points around.
const a = hexbin([{ lon: 0.0123, lat: 0.0045 }], { origin: [0, 0] })[0].key;
const b = hexbin([{ lon: 0.0123, lat: 0.0045 }, { lon: 0.05, lat: 0.05 }], { origin: [0, 0] }).find((x) => x.count === 1 && Math.abs(x.centre[0] - 0.0123) < 0.003).key;
assert.equal(a, b);

// Hexagons are closed rings of six corners, a little smaller than their spacing.
const [h] = hexbin([{ lon: 0, lat: 0 }], { origin: [0, 0], size: 200, gap: 0.1 });
assert.equal(h.ring.length, 7);
assert.deepEqual(h.ring[0], h.ring[6]);
const widthM = (Math.max(...h.ring.map((p) => p[0])) - Math.min(...h.ring.map((p) => p[0]))) * 111_320;
assert.ok(Math.abs(widthM - 200 * 0.9 * Math.sqrt(3)) < 1, 'pointy-top width is √3 × the drawn size');

// Without an origin, the grid is measured from the points' middle, to a tenth of a degree.
assert.deepEqual(centreOf([{ lon: 0.04, lat: -0.02 }, { lon: 0.08, lat: 0.06 }]), [0.1, 0]);

// GeoJSON for the map.
const fc = hexFeatures(spread);
assert.equal(fc.type, 'FeatureCollection');
assert.equal(fc.features.length, 4);
assert.deepEqual(Object.keys(fc.features[0].properties).sort(), ['count', 'height', 'key', 'rank']);
console.log('hexbin: ok');
