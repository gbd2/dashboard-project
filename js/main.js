import { createTractLayer } from './tracts.js';

const map = L.map('map', {
  maxBounds: [[28.9, -96.4], [30.6, -94.4]],
  maxBoundsViscosity: 1.0,
  minZoom: 9,
  zoomSnap: 0.5,
}).setView([29.76, -95.37], 10);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
}).addTo(map);

map.createPane('maskPane');
map.getPane('maskPane').style.zIndex = 420;
map.getPane('maskPane').style.pointerEvents = 'none';

const [tracts, mask, boundary] = await Promise.all([
  fetch('data/tracts.geojson').then((r) => r.json()),
  fetch('data/harris-mask.geojson').then((r) => r.json()),
  fetch('data/harris-boundary.geojson').then((r) => r.json()),
]);

createTractLayer(tracts).addTo(map);

const maskRenderer = L.svg({ padding: 3, pane: 'maskPane' });

L.geoJSON(mask, {
  pane: 'maskPane',
  renderer: maskRenderer,
  interactive: false,
  style: { stroke: false, fillColor: '#e9ebe6', fillOpacity: 0.85 },
}).addTo(map);

const county = L.geoJSON(boundary, {
  pane: 'maskPane',
  renderer: maskRenderer,
  interactive: false,
  style: { color: 'rgb(18 26 22 / 45%)', weight: 1.25, fill: false },
}).addTo(map);

map.fitBounds(county.getBounds(), { padding: [8, 8] });