// Plan step: place stores within the recruitment fund and see what they buy.

import { FORMATS, DEFAULT_ASSUMPTIONS, evaluate } from './model.js';
import { findFeature, inFeature } from './geo.js';
import { money } from './format.js';
import { renderResults } from './results.js';

const REACH_METERS = 1609.344;

// Funds can go to food deserts (always by the grocery definition, so the
// step 1 switch can't change where money is allowed) or Opportunity Zones.
function isEligible(p) {
  return Boolean(p && (p.lila_grocery || p.oz_eligible || p.oz_nominated));
}

function createPlanner({ map, tracts, blocks, stops, city }) {
  const el = (id) => document.getElementById(id);
  const tractRows = tracts.features.map((f) => f.properties);
  const inCity = (lon, lat) => city.features.some((f) => inFeature(lon, lat, f));
  const layer = L.layerGroup();
  const assumptions = structuredClone(DEFAULT_ASSUMPTIONS);
  let stores = [];
  let nextId = 1;
  let result = null;

  function say(message) {
    el('plan-message').textContent = message;
  }

  function currentFormat() {
    return document.querySelector('input[name="format"]:checked').value;
  }

  // Each input's id and how its value (in $M or %) sets the assumption.
  const ASSUME_INPUTS = [
    ['a-budget', (v) => { assumptions.budget = v * 1e6; }],
    ['a-incentive-full', (v) => { assumptions.incentive.full = v * 1e6; }],
    ['a-incentive-small', (v) => { assumptions.incentive.small = v * 1e6; }],
    ['a-floor-full', (v) => { assumptions.floor.full = v * 1e6; }],
    ['a-floor-small', (v) => { assumptions.floor.small = v * 1e6; }],
    ['a-value-full', (v) => { assumptions.buildingValue.full = v * 1e6; }],
    ['a-value-small', (v) => { assumptions.buildingValue.small = v * 1e6; }],
    ['a-taxable', (v) => { assumptions.taxableShare = v / 100; }],
  ];

  // Blank or negative entries keep the last good value.
  function readAssumptions() {
    for (const [id, set] of ASSUME_INPUTS) {
      const v = Number(el(id).value);
      if (el(id).value !== '' && Number.isFinite(v) && v >= 0) { set(v); }
    }
  }

  function committed() {
    return stores.reduce((sum, s) => sum + assumptions.incentive[s.format], 0);
  }

  function place(latlng) {
    const tract = findFeature(latlng.lng, latlng.lat, tracts);
    const p = tract && tract.properties;
    if (!isEligible(p)) {
      say("Recruitment funds can't go here. Choose a shaded tract.");
      return;
    }
    const format = currentFormat();
    const cost = assumptions.incentive[format];
    if (committed() + cost > assumptions.budget) {
      say(`Over budget. This ${FORMATS[format].label.toLowerCase()} needs ${money(cost)} and the fund has ${money(assumptions.budget - committed())} left.`);
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

  // Stores that won't reach break-even sales turn red on the map and the list.
  function pinHtml(s, i) {
    return `<span class="plan-pin${s.viable ? '' : ' is-weak'}${s.format === 'small' ? ' is-small' : ''}">${i + 1}</span>`;
  }

  function drawMap() {
    layer.clearLayers();
    result.stores.forEach((s, i) => {
      const color = s.viable ? '#1f7a4d' : '#9b2c12';
      L.circle([s.lat, s.lon], {
        radius: REACH_METERS,
        pane: 'zonePane',
        interactive: false,
        color,
        weight: 1.5,
        dashArray: '4 4',
        fillColor: color,
        fillOpacity: 0.08,
      }).addTo(layer);
      const icon = L.divIcon({ className: 'plan-marker', html: pinHtml(s, i), iconSize: [28, 28] });
      L.marker([s.lat, s.lon], { icon, pane: 'rankPane', draggable: true, keyboard: false, title: `Store ${i + 1}, drag to move` })
        .on('dragend', (e) => move(s.id, e.target.getLatLng()))
        .addTo(layer);
    });
  }

  function storeFacts(s) {
    const facts = [`${money(s.sales)} a year`, `${s.stopsNearby} bus stops within &frac14; mile`];
    if (!s.viable) { facts.unshift('<b class="weak">Below break-even sales</b>'); }
    if (!s.inCity) { facts.push('outside city limits'); }
    return facts.join(', ');
  }

  function drawList() {
    const spent = result.cost;
    el('budget-text').textContent = `${money(spent)} of ${money(assumptions.budget)} committed`;
    el('budget-fill').style.width = `${assumptions.budget ? Math.min(100, (spent / assumptions.budget) * 100) : 0}%`;
    for (const span of document.querySelectorAll('[data-cost]')) {
      span.textContent = money(assumptions.incentive[span.dataset.cost]);
    }

    el('plan-empty').hidden = stores.length > 0;
    if (!stores.length) {
      el('plan-results').innerHTML = '';
      el('plan-stores').innerHTML = '';
      return;
    }
    renderResults(el('plan-results'), result);
    el('plan-stores').innerHTML = result.stores.map((s, i) => `
      <li class="plan-store">
        ${pinHtml(s, i)}
        <span class="plan-store-main">
          <span class="plan-store-name">${FORMATS[s.format].label}, ${s.hood}</span>
          <span class="plan-store-facts">${storeFacts(s)}</span>
        </span>
        <button type="button" class="btn small" data-remove="${s.id}" aria-label="Remove store ${i + 1}">Remove</button>
      </li>`).join('');
  }

  function update() {
    readAssumptions();
    result = evaluate({ stores, assumptions }, { blocks, tracts: tractRows, stops, inCity });
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

  for (const [id] of ASSUME_INPUTS) {
    el(id).addEventListener('change', update);
  }

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