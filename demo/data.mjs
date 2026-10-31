// Synthetic data, generated from a fixed seed. Nothing here was ever measured.

const random = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const SERIES = ['Alder', 'Birch', 'Cedar'];
export const STACK = ['Alder', 'Birch', 'Cedar', 'Dogwood', 'Elm', 'Fir', 'Ginkgo', 'Hazel'];

export const lines = (() => {
  const r = random(7);
  return SERIES.flatMap((series, s) => {
    let y = 40 + s * 18;
    return Array.from({ length: 24 }, (_, week) => {
      y += (r() - 0.46) * 6;
      return { week: week + 1, series, y: Math.round(y * 10) / 10 };
    });
  });
})();

export const stack = (() => {
  const r = random(11);
  return ['Q1', 'Q2', 'Q3', 'Q4'].flatMap((period) =>
    STACK.map((series) => ({ period, series, value: Math.round(5 + r() * 20) })),
  );
})();

export const shares = [
  { label: 'Alder', value: 24 },
  { label: 'Birch', value: 21 },
  { label: 'Cedar', value: 16 },
  { label: 'Dogwood', value: 13 },
  { label: 'Elm', value: 10 },
  { label: 'Fir', value: 9 },
  { label: 'Ginkgo', value: 7 },
];

export const grid = (() => {
  const r = random(23);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.flatMap((day, d) =>
    Array.from({ length: 24 }, (_, hour) => {
      const wave = Math.sin(((hour - 6) / 24) * Math.PI * 2);
      return { day, hour, value: Math.round(50 + 34 * wave + (d > 4 ? -8 : 6) + r() * 14) };
    }),
  );
})();

export const deltas = (() => {
  const r = random(31);
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, delta: Math.round((r() - 0.5) * 36) }));
})();
