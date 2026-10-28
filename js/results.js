// Step 3 results

import { int, money } from './format.js';

function years(n) {
  if (n == null) { return 'never'; }
  return n > 99 ? 'over 99 years' : `${Math.round(n)} years`;
}

function renderResults(el, r) {
  el.innerHTML = `
    <p class="lead-number">${int(r.newlyReached)}</p>
    <p class="lead-label">residents newly within a mile of a grocery store</p>
    <p class="lead-sub">${int(r.desertReached)} of them in food desert tracts, and ${int(r.carFreeReached)} car-free households</p>
    <h3 class="ledger-group">What the city gets back</h3>
    <p class="payback">${money(r.cost)} incentives &divide; ${money(r.cityRevenue)} a year in city tax = <b>${years(r.payback)}</b></p>
    <dl class="ledger">
      <div><dt>Projected grocer sales a year</dt><dd>${money(r.sales)}</dd></div>
      <div><dt>Taken from existing stores</dt><dd>${money(r.shifted)}</dd></div>
    </dl>`;
}

export { renderResults };