// Weighted site scores and the ranked shortlist.

const FACTORS = ['need', 'viability', 'leverage'];

// Weighted average of the three factor scores, each already 0 to 100. Tracts
// with no need score (too few residents, or mostly group quarters) stay unscored.
function scoreTract(p, weights) {
  if (p.need == null) { return null; }
  const total = FACTORS.reduce((sum, f) => sum + weights[f], 0);
  if (total === 0) { return 0; }
  return FACTORS.reduce((sum, f) => sum + p[f] * weights[f], 0) / total;
}

function applyScores(tracts, weights) {
  for (const { properties: p } of tracts.features) {
    p.score = scoreTract(p, weights);
  }
}

// Highest scores first.
function shortlist(tracts, size = 10) {
  return tracts.features
    .map((f) => f.properties)
    .filter((p) => p.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, size);
}

export { FACTORS, applyScores, shortlist, scoreTract };