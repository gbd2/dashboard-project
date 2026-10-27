// Plan step: place stores on the map without going over the recruitment fund.

import { findFeature } from './geo.js';

const FORMATS = {
  full: { label: 'Full supermarket' },
  small: { label: 'Neighborhood grocer' },
};

const BUDGET = 10e6;
const INCENTIVE = { full: 3e6, small: 1e6 };
const REACH_METERS = 1609.344;

// Funds can go to food deserts (always by the grocery definition, so the
// step 1 switch can't change where money is allowed) or Opportunity Zones.
function isEligible(p) {
  return Boolean(p && (p.lila_grocery || p.oz_eligible || p.oz_nominated));
}

function money(n) {
  if (n >= 1e6) { return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`; }
  if (n >= 1e3) { return `$${Math.round(n / 1e3)}k`; }
  return `$${Math.round(n)}`;
}

function createPlanner({ map, tracts }) {
  const el = (id) => document.getElementById(id);
  const layer = L.layerGroup();
  let stores = [];
  let nextId = 1;

  function say(message) {
    el('plan-message').textContent = message;
  }

  function currentFormat() {
    return document.querySelector('input[name="format"]:checked').value;
  }

  function committed() {
    return stores.reduce((sum, s) => sum + INCENTIVE[s.format], 0);
  }

  function place(latlng) {
    const tract = findFeature(latlng.lng, latlng.lat, tracts);
    const p = tract && tract.properties;
    if (!isEligible(p)) {
      say("Recruitment funds can't go here. Choose a shaded tract.");
      return;
    }
    const format = currentFormat();
    const cost = INCENTIVE[format];
    if (committed() + cost > BUDGET) {
      say(`Over budget. This ${FORMATS[format].label.toLowerCase()} needs ${money(cost)} and the fund has ${money(BUDGET - committed())} left.`);
      return;
    }
    stores.push({ id: nextId++, format, lat: latlng.lat, lon: latlng.lng, hood: p.hood });
    say(`Placed a ${FORMATS[format].label.toLowerCase()} in ${p.hood}.`);
    update();
  }

  // A store dropped outside an eligible tract snaps back on the redraw.
  function move(id, latlng) {
    const store = stores.find((s) => s.id === id);
    const tract = findFeature(latlng.lng, latlng.lat, tracts);
    if (!isEligible(tract && tract.properties)) {
      say('That spot is not eligible for recruitment funds, so the store went back.');
    } else {
      store.lat = latlng.lat;
      store.lon = latlng.lng;
      store.hood = tract.properties.hood;
      say(`Moved the store to ${store.hood}.`);
    }
    update();
  }

  function remove(id) {
    stores = stores.filter((s) => s.id !== id);
    say('Removed the store.');
    update();
  }

  function pinHtml(s, i) {
    return `<span class="plan-pin${s.format === 'small' ? ' is-small' : ''}">${i + 1}</span>`;
  }

  function drawMap() {
    layer.clearLayers();
    stores.forEach((s, i) => {
      L.circle([s.lat, s.lon], {
        radius: REACH_METERS,
        pane: 'zonePane',
        interactive: false,
        color: '#1f7a4d',
        weight: 1.5,
        dashArray: '4 4',
        fillColor: '#1f7a4d',
        fillOpacity: 0.08,
      }).addTo(layer);
      const icon = L.divIcon({ className: 'plan-marker', html: pinHtml(s, i), iconSize: [28, 28] });
      L.marker([s.lat, s.lon], { icon, pane: 'rankPane', draggable: true, keyboard: false, title: `Store ${i + 1}, drag to move` })
        .on('dragend', (e) => move(s.id, e.target.getLatLng()))
        .addTo(layer);
    });
  }

  function drawList() {
    const spent = committed();
    el('budget-text').textContent = `${money(spent)} of ${money(BUDGET)} committed`;
    el('budget-fill').style.width = `${Math.min(100, (spent / BUDGET) * 100)}%`;
    el('plan-empty').hidden = stores.length > 0;
    el('plan-stores').innerHTML = stores.map((s, i) => `
      <li class="plan-store">
        ${pinHtml(s, i)}
        <span class="plan-store-name">${FORMATS[s.format].label}, ${s.hood}</span>
        <button type="button" class="btn small" data-remove="${s.id}" aria-label="Remove store ${i + 1}">Remove</button>
      </li>`).join('');
  }

  function update() {
    drawMap();
    drawList();
  }

  el('plan-stores').addEventListener('click', (e) => {
    const button = e.target.closest('[data-remove]');
    if (button) { remove(Number(button.dataset.remove)); }
  });

  el('plan-clear').addEventListener('click', () => {
    stores = [];
    say('Cleared the plan.');
    update();
  });

  function show(visible) {
    if (visible) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  }

  update();
  return { place, show };
}

export { createPlanner };