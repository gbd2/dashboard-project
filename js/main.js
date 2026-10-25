import { createTractLayer, summarize } from './tracts.js';
import { createStoreLayers, countStores } from './stores.js';
import { renderLegend } from './legend.js';
import { renderHeadline } from './headline.js';
import { int } from './format.js';

const state = {
  definition: 'grocery',
};

const NOTES = {
  grocery: "These are the store types USDA's own Large Retailer Access Map counts.",
  usda: "This is how USDA's new 2025 map counts access. By that measure, a gas station is food access.",
};

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
map.createPane('storePane');
map.getPane('storePane').style.zIndex = 450;

const [tracts, stores, mask, boundary] = await Promise.all([
  fetch('data/tracts.geojson').then((r) => r.json()),
  fetch('data/stores.geojson').then((r) => r.json()),
  fetch('data/harris-mask.geojson').then((r) => r.json()),
  fetch('data/harris-boundary.geojson').then((r) => r.json()),
]);

const tractLayer = createTractLayer(tracts, state);
tractLayer.addTo(map);
const storeLayers = createStoreLayers(stores);
storeLayers.grocery.addTo(map);

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

const counts = countStores(stores);
counts.snap = counts.grocery + counts.small + counts.dollar + counts.convenience;
for (const el of document.querySelectorAll('[data-count]')) {
  el.textContent = int(counts[el.dataset.count] || 0);
}

for (const input of document.querySelectorAll('input[name="layer"]')) {
  const layer = storeLayers[input.value];
  if (input.checked) { layer.addTo(map); }
  input.addEventListener('change', () => {
    if (input.checked) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  });
}

const headlineStats = { grocery: summarize(tracts, 'grocery'), usda: summarize(tracts, 'usda') };

function updateHeadline() {
  renderHeadline(document.getElementById('headline'), headlineStats, state.definition);
  document.getElementById('definition-note').textContent = NOTES[state.definition];
}

for (const input of document.querySelectorAll('input[name="definition"]')) {
  input.addEventListener('change', () => {
    state.definition = input.value;
    tractLayer.restyle();
    updateHeadline();
  });
}

updateHeadline();

renderLegend(document.getElementById('legend'));