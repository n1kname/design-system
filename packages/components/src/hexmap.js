// Hexagons of counts on a MapLibre map: flat and coloured along the heat ramp by rank, or raised in
// 3D by height, from @n1kname/charts/hexbin's features. It adds its layers again after every
// setStyle (a theme or basemap change), resolves its colours for the canvas each time, and says the
// count under the pointer in the charts' pointer card.
//
// It never imports MapLibre: pass the map, and the Popup class for the pointer card.
//
//     import maplibregl from 'maplibre-gl';
//     import { hexbin, hexFeatures } from '@n1kname/charts/hexbin';
//     import { hexLayers } from '@n1kname/components/hexmap.js';
//
//     const hexes = hexLayers(map, { Popup: maplibregl.Popup, card: (p) => `<strong>${p.count}</strong> points` });
//     hexes.setData(hexFeatures(hexbin(points, { origin })));
//     view.addEventListener('segment-change', (e) => hexes.setTall(e.detail.value === '3d'));

import { HEAT, onTheme, ramp } from './mapstage.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Rising takes longer than settling: leaving is quicker than arriving. The camera tilts over the
// same time as the rise, so the two land together.
const RISE = 700;
const SETTLE = 500;
// Ease-out (cubic): most of the travel early, a soft landing.
const out = (t) => 1 - (1 - t) ** 3;

/**
 * map: a MapLibre map. Options:
 *   id        the source's name, and the layers' prefix ('hexes')
 *   colours   the ramp, low to high (the heat tokens)
 *   tall      metres the busiest hexagon rises to (10,000 for a city at zoom 11)
 *   opacity   ({ tall }) => a fill opacity: see-through enough for the streets under it
 *   pitch, bearing   the camera in 3D
 *   Popup, card      the Popup class and (properties) => HTML, for a card under the pointer
 *   onDrawn   called once the map has drawn new data (tests and "ready" wait for it)
 * Returns { setData, setTall, restyle, isTall }.
 */
export const hexLayers = (
  map,
  {
    id = 'hexes',
    colours = HEAT,
    tall: tallMetres = 10_000,
    opacity = ({ tall }) => (tall ? 0.7 : 0.5),
    pitch = 55,
    bearing = -15,
    Popup,
    card,
    onDrawn,
  } = {},
) => {
  const FLAT = `${id}-flat`;
  const TALL = `${id}-tall`;
  let data = { type: 'FeatureCollection', features: [] };
  let tall = false;
  let rise = 0;
  let frame = 0;

  const colour = () => ramp('rank', colours);
  const height = () => ['*', ['get', 'height'], tallMetres * rise];

  const add = () => {
    if (map.getSource(id)) return;
    map.addSource(id, { type: 'geojson', data });
    map.addLayer({ id: FLAT, type: 'fill', source: id, layout: { visibility: tall ? 'none' : 'visible' }, paint: { 'fill-color': colour(), 'fill-opacity': opacity({ tall: false }) } });
    map.addLayer({
      id: TALL,
      type: 'fill-extrusion',
      source: id,
      layout: { visibility: tall ? 'visible' : 'none' },
      paint: { 'fill-extrusion-color': colour(), 'fill-extrusion-opacity': opacity({ tall: true }), 'fill-extrusion-height': height() },
    });
  };

  // A style still loading can't take changes: its layers come in as they should once it is.
  const restyle = () => {
    try {
      if (!map.getLayer(FLAT)) return;
      map.setLayoutProperty(TALL, 'visibility', tall ? 'visible' : 'none');
      map.setLayoutProperty(FLAT, 'visibility', tall ? 'none' : 'visible');
      map.setPaintProperty(FLAT, 'fill-color', colour());
      map.setPaintProperty(FLAT, 'fill-opacity', opacity({ tall: false }));
      map.setPaintProperty(TALL, 'fill-extrusion-color', colour());
      map.setPaintProperty(TALL, 'fill-extrusion-opacity', opacity({ tall: true }));
    } catch {
      map.once('idle', restyle);
    }
  };

  const animate = (to, duration, done) => {
    cancelAnimationFrame(frame);
    const from = rise;
    const span = reduced() ? 0 : duration;
    const start = performance.now();
    const tick = (now) => {
      const t = span ? Math.min((now - start) / span, 1) : 1;
      rise = from + (to - from) * out(t);
      try {
        if (map.getLayer(TALL)) map.setPaintProperty(TALL, 'fill-extrusion-height', height());
      } catch {}
      if (t < 1) frame = requestAnimationFrame(tick);
      else done?.();
    };
    frame = requestAnimationFrame(tick);
  };

  const setTall = (on) => {
    tall = on;
    map.easeTo({ pitch: on ? pitch : 0, bearing: on ? bearing : 0, duration: reduced() ? 0 : on ? RISE : SETTLE });
    if (on) {
      restyle();
      animate(1, RISE);
    } else {
      // Settle first, then swap to the flat layer, so they don't drop through the floor.
      animate(0, SETTLE, restyle);
    }
  };

  const setData = (next) => {
    data = next;
    map.getSource(id)?.setData(data);
    if (onDrawn) map.once('idle', onDrawn);
  };

  if (map.isStyleLoaded?.()) add();
  map.on('style.load', add);
  onTheme(restyle);

  if (Popup && card) {
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'place-card' });
    for (const layer of [FLAT, TALL]) {
      map.on('mousemove', layer, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.lngLat).setHTML(`<div class="chart-pointer-card"><p class="chart-pointer-one">${card(e.features[0].properties)}</p></div>`).addTo(map);
      });
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    }
  }

  return { setData, setTall, restyle, isTall: () => tall };
};
