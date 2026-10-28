// What-if model new stores. This model simulates who a new store reaches,
// what sales they take / generate, and what the city gets back in tax revenue. 

import { milesBetween } from './scores.js';

const FORMATS = {
  full: { label: 'Full supermarket', size: 1.0 },
  small: { label: 'Neighborhood grocer', size: 0.33 },
};

// Planning assumptions (editable in interface)
const DEFAULT_ASSUMPTIONS = {
  budget: 10e6,
  incentive: { full: 3e6, small: 1e6 },
  floor: { full: 15e6, small: 5e6 },
  buildingValue: { full: 12e6, small: 4e6 },
  taxableShare: 0.25,
};

const CITY_SALES_TAX = 0.01;
const CITY_PROPERTY_TAX = 0.0051919;

const HUFF_MI = 5;
const MIN_MI = 0.25;
// The pull of everything else someone can buy groceries from (a supermarket
// 5 miles away, online, warehouse clubs).
const OUTSIDE_PULL = 1 / HUFF_MI ** 2;
const STOP_WALK_MI = 0.25;

// Each block row carries pull, the summed pull of the existing grocery
// stores on it (store size over distance squared, within 5 miles),
// new stores add their own pull on top.
function evaluate(plan, { blocks, tracts, stops, inCity }) {
  const stores = plan.stores.map((s) => ({
    ...s,
    size: FORMATS[s.format].size,
    sales: 0,
    shifted: 0,
    stopsNearby: stops.filter(([lon, lat]) => milesBetween(s, { lat, lon }) <= STOP_WALK_MI).length,
    inCity: inCity(s.lon, s.lat),
  }));

  let newlyReached = 0;
  let desertReached = 0;
  let carFreeReached = 0;

  for (const [lon, lat, pop, t, dGrocery, , pull, spend] of blocks) {
    const block = { lat, lon };
    const tract = tracts[t];
    const limit = tract.urban ? 1 : 10;
    let newPull = 0;
    let nearest = Infinity;
    const pulls = [];
    for (const s of stores) {
      const d = milesBetween(block, s);
      nearest = Math.min(nearest, d);
      const p = d <= HUFF_MI ? s.size / Math.max(d, MIN_MI) ** 2 : 0;
      pulls.push(p);
      newPull += p;
    }

    if (dGrocery > limit && nearest <= limit) {
      newlyReached += pop;
      if (tract.lila_grocery) { desertReached += pop; }
      if (tract.pop) { carFreeReached += tract.nocar * (pop / tract.pop); }
    }

    if (newPull === 0 || spend === 0) { continue; }
    const total = pull + newPull + OUTSIDE_PULL;
    // Existing stores lose the difference between their share before and after.
    const shifted = spend * (pull / (pull + OUTSIDE_PULL) - pull / total);
    stores.forEach((s, i) => {
      if (!pulls[i]) { return; }
      s.sales += (spend * pulls[i]) / total;
      s.shifted += shifted * (pulls[i] / newPull);
    });
  }

  const a = plan.assumptions;
  let cost = 0;
  let sales = 0;
  let shifted = 0;
  let cityRevenue = 0;
  for (const s of stores) {
    s.cost = a.incentive[s.format];
    s.viable = s.sales >= a.floor[s.format];
    // Sales taken from existing stores were already taxed, so only the rest is new.
    const netNew = Math.max(s.sales - s.shifted, 0);
    s.cityRevenue = s.inCity
      ? netNew * a.taxableShare * CITY_SALES_TAX + a.buildingValue[s.format] * CITY_PROPERTY_TAX
      : 0;
    cost += s.cost;
    sales += s.sales;
    shifted += s.shifted;
    cityRevenue += s.cityRevenue;
  }

  return {
    stores,
    cost,
    sales,
    shifted,
    cityRevenue,
    payback: cityRevenue > 0 ? cost / cityRevenue : null,
    newlyReached,
    desertReached,
    carFreeReached,
  };
}

export { FORMATS, DEFAULT_ASSUMPTIONS, evaluate };