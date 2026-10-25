// Census tract layer shaded by grocery access

const FILLS = {
  lila: '#c4441c',
  la: '#f2b48c',
  ok: '#f7f8f5',
};

const DEFINITIONS = {
  grocery: { lila: 'lila_grocery', la: 'la_grocery', far: 'far_grocery' },
  usda: { lila: 'lila_usda', la: 'la_usda', far: 'far_any' },
};

// lila = low income and low access (a food desert). la = low access only.
function accessClass(p, definition) {
  const fields = DEFINITIONS[definition];
  if (p[fields.lila]) { return 'lila'; }
  if (p[fields.la]) { return 'la'; }
  return 'ok';
}

function tractStyle(p, state) {
  const cls = accessClass(p, state.definition);
  const selected = p.geoid === state.selected;
  return {
    color: selected ? '#1a211d' : 'rgb(18 26 22 / 22%)',
    weight: selected ? 2.5 : 0.5,
    fillColor: FILLS[cls],
    fillOpacity: cls === 'ok' ? 0.35 : 0.78,
  };
}

function createTractLayer(tracts, state, onSelect) {
  const layer = L.geoJSON(tracts, {
    style: (f) => tractStyle(f.properties, state),
    onEachFeature: (f, l) => {
      l.bindTooltip(`Tract ${f.properties.name}`, { sticky: true });
      l.on('click', () => onSelect(f.properties.geoid));
    },
  });

  // Recolor when the definition or selection changes instead of
  // rebuilding the layer.
  layer.restyle = () => {
    layer.eachLayer((l) => {
      l.setStyle(tractStyle(l.feature.properties, state));
      if (l.feature.properties.geoid === state.selected) { l.bringToFront(); }
    });
  };

  return layer;
}

// Headline numbers (desert tracts, population, and residents beyond reach of a store)
function summarize(tracts, definition) {
  const fields = DEFINITIONS[definition];
  let count = 0;
  let residents = 0;
  let farTotal = 0;
  for (const { properties: p } of tracts.features) {
    farTotal += p[fields.far];
    if (p[fields.lila]) {
      count += 1;
      residents += p.pop;
    }
  }
  return { count, residents, farTotal };
}

export { FILLS, createTractLayer, summarize, accessClass};