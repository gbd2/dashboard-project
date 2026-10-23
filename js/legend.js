// Map legend for the tract colors

import { FILLS } from './tracts.js';

function row(fill, label) {
  return `<p class="legend-row"><span class="swatch fill" style="background-color: ${fill}"></span>${label}</p>`;
}

function renderLegend(el) {
  el.innerHTML = `
    <p class="legend-title">Census tracts</p>
    ${row(FILLS.lila, 'Low income and low access')}
    ${row(FILLS.la, 'Low access only')}
    ${row(FILLS.ok, 'Within reach of a store')}`;
}

export { renderLegend };