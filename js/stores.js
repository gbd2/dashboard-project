const STORE_COLORS = {
  grocery: '#1f7a4d',
  small: '#2f8f9d',
  dollar: '#b0457b',
  convenience: '#8a8f96',
};

const STORE_LABELS = {
  grocery: 'Grocery store',
  small: 'Small grocer',
  dollar: 'Dollar store or pharmacy',
  convenience: 'Convenience store',
};

function createStoreLayers(stores) {
  // Canvas draws dots much faster than having a SVG element per dot.
  const renderer = L.canvas({ pane: 'storePane', padding: 0.3 });
  const layers = {};
  for (const cat of Object.keys(STORE_COLORS)) {
    layers[cat] = L.layerGroup();
  }

  for (const feature of stores.features) {
    const { name, addr, cat } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    L.circleMarker([lat, lon], {
      renderer,
      pane: 'storePane',
      radius: cat === 'grocery' ? 4.5 : 3.5,
      color: '#fff',
      weight: 1,
      fillColor: STORE_COLORS[cat],
      fillOpacity: 1,
    })
      .bindTooltip(`<b>${name}</b><span class="tip-type">${STORE_LABELS[cat]}, ${addr}</span>`)
      .addTo(layers[cat]);
  }

  return layers;
}

export { createStoreLayers };