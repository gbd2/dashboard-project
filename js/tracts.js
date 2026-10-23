// Census tract layer shaded by grocery access

const FILLS = {
  lila: '#c4441c',
  la: '#f2b48c',
  ok: '#f7f8f5',
};

// lila = low income and low access (a food desert). la = low access only.
function accessClass(p) {
  if (p.lila_grocery) { return 'lila'; }
  if (p.la_grocery) { return 'la'; }
  return 'ok';
}

function tractStyle(p) {
  const cls = accessClass(p);
  return {
    color: 'rgb(18 26 22 / 22%)',
    weight: 0.5,
    fillColor: FILLS[cls],
    fillOpacity: cls === 'ok' ? 0.35 : 0.78,
  };
}

function createTractLayer(tracts) {
  return L.geoJSON(tracts, {
    style: (f) => tractStyle(f.properties),
    onEachFeature: (f, layer) => {
      layer.bindTooltip(`Tract ${f.properties.name}`, { sticky: true });
    },
  });
}

export { createTractLayer };