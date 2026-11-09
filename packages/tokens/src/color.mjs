// OKLCH to sRGB and WCAG contrast, no dependencies. Ramps are built in OKLCH
// because equal lightness steps look equal there, and gamut-clipped to sRGB by
// lowering chroma at a fixed lightness and hue.

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055);

export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};

// Rounds half to even, like the Python generator this replaces, so ramps stay byte-identical.
const roundEven = (x) => {
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
};

export const rgbToHex = (rgb) =>
  '#' +
  rgb
    .map((c) => roundEven(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

export const rgbToOklab = (rgb) => {
  const [r, g, b] = rgb.map(srgbToLinear);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const [l_, m_, s_] = [l, m, s].map(Math.cbrt);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
};

const oklabToRgb = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

// A colour at `alpha` over another, composited in sRGB as the browser paints a see-through layer.
export const over = (top, alpha, under) => {
  const [t, u] = [hexToRgb(top), hexToRgb(under)];
  return rgbToHex(t.map((c, i) => c * alpha + u[i] * (1 - alpha)));
};

const lchToLab = (L, C, h) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

export const hexToOklch = (hex) => {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
};

const inGamut = (rgb, eps = 1e-4) => rgb.every((c) => c >= -eps && c <= 1 + eps);

export const oklch = (L, C, h) => {
  const at = (c) => oklabToRgb(lchToLab(L, c, h));
  if (inGamut(at(C))) return rgbToHex(at(C));
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return rgbToHex(at(lo));
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear RGB.
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const labOf = (hex, kind) => {
  if (!kind) return rgbToOklab(hexToRgb(hex));
  const lin = hexToRgb(hex).map(srgbToLinear);
  const sim = CVD[kind].map((row) =>
    Math.max(0, Math.min(1, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])),
  );
  return rgbToOklab(sim.map(linearToSrgb));
};

// Euclidean distance in OKLab, times 100. `kind` is undefined, 'protan', 'deutan' or 'tritan'.
export const deltaE = (a, b, kind) => {
  const [p, q] = [labOf(a, kind), labOf(b, kind)];
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
