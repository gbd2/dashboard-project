// How many food desert tracts the chosen definition corresponds to.

import { int, compact } from './format.js';

const STORE_WORD = { grocery: 'a grocery store', usda: 'any SNAP store' };

function renderHeadline(el, stats, def) {
  const s = stats[def];
  el.innerHTML = `
    <p class="stat-number">${int(s.count)}</p>
    <p class="stat-label">low income tracts where many residents live over a mile from ${STORE_WORD[def]}</p>
    <p class="stat-sub">${compact(s.residents)} residents live in those tracts, and ${compact(s.farTotal)} people countywide live beyond reach of ${STORE_WORD[def]}.</p>`;
}

export { renderHeadline };