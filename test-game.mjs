import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialWeights, averageEdge, goalsMet, distances, validateLevel } from './docs/engine.js';

const levels = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
const certificates = JSON.parse(readFileSync(new URL('./validation/level-solutions.json', import.meta.url), 'utf8')).levels;
assert.equal(levels.length, 30);
assert.equal(new Set(levels.map(level => level.id)).size, 30);
const counts = entries => Object.fromEntries(['Easy', 'Medium', 'Hard', 'Master'].map(difficulty => [difficulty, entries.filter(level => level.difficulty === difficulty).length]));
assert.deepEqual(counts(levels), { Easy: 3, Medium: 13, Hard: 10, Master: 4 });
assert.deepEqual(counts(levels.filter(level => level.id > 10)), { Easy: 0, Medium: 10, Hard: 7, Master: 3 });
const rank = { Easy: 0, Medium: 1, Hard: 2, Master: 3 };
levels.slice(1).forEach((level, index) => {
  const previous = levels[index];
  assert.ok(rank[level.difficulty] >= rank[previous.difficulty], 'Difficulty must increase through the campaign');
  if (level.difficulty === previous.difficulty) assert.ok(level.par >= previous.par, 'Move targets increase within each difficulty');
});
let checks = 0;
for (const [index, level] of levels.entries()) {
  assert.deepEqual(validateLevel(level), [], 'Invalid level ' + level.id);
  assert.ok(!Object.hasOwn(level, 'solution'), 'Do not ship a walkthrough in runtime level data');
  assert.ok(level.nodes.filter(node => node.goal !== undefined).length <= 3, 'At most three blooms per garden');
  const certificate = certificates[level.id];
  assert.ok(certificate && Array.isArray(certificate.solution), 'Missing development-only witness for stable ID ' + level.id);
  assert.equal(certificate.optimalVerified, true, 'Golden-bloom optimum must be certified');
  assert.equal(level.parVerified, true, 'Publish only verified golden-bloom targets');
  assert.equal(certificate.optimalMoves, level.par);
  assert.equal(certificate.solution.length, level.par);
  if (index > 0) assert.ok(level.budget > level.par, 'Progression has a more generous allowance than gold');
  const limits = distances(level).map(distance => 100 / (distance + 1));
  let weights = initialWeights(level);
  const snapshots = [];
  assert.equal(goalsMet(level, weights), false);
  for (const edgeIndex of certificate.solution) {
    assert.ok(Number.isInteger(edgeIndex) && level.edges[edgeIndex], 'Valid witness edge');
    const [a, b] = level.edges[edgeIndex];
    assert.notEqual(weights[a], weights[b], 'Balanced edges do not count as moves');
    assert.equal(goalsMet(level, weights), false, 'A shortest witness cannot continue after winning');
    snapshots.push(weights);
    const oldWeights = weights.slice();
    weights = averageEdge(weights, level.edges[edgeIndex]);
    assert.deepEqual(snapshots.at(-1), oldWeights, 'History must not be mutated');
    assert.equal(weights.reduce((sum, value) => sum + value, 0), 100, 'Conserve all light');
    weights.forEach((value, index) => assert.ok(value >= 0 && value <= limits[index] + 1e-10, 'Distance ceiling'));
    checks++;
  }
  assert.ok(goalsMet(level, weights), 'Witness must satisfy all goals together');
  assert.ok(snapshots.length <= level.budget && snapshots.length <= level.par);
  assert.equal(goalsMet(level, snapshots.at(-1)), false, 'Witness should finish on its final move');
  assert.deepEqual(snapshots[0], initialWeights(level), 'Restart must recover the original state');
  console.log('PASS level ' + (index + 1) + ': ' + level.name + ' (' + snapshots.length + '/' + level.budget + ' moves, stable ID ' + level.id + ')');
}
const fork = levels.find(level => level.id === 4);
let greedy = initialWeights(fork);
for (const edge of [0, 1, 0, 1, 2]) greedy = averageEdge(greedy, fork.edges[edge]);
assert.equal(goalsMet(fork, greedy), false, 'Greedy allocation must not satisfy both targets');
assert.ok(validateLevel({ ...levels[0], edges: [[0, 1], [1, 0]] }).includes('Duplicate edge'), 'Reject duplicated undirected connections');
assert.ok(validateLevel({ ...levels[0], edges: [[0, 99]] }).includes('Invalid edge'), 'Reject invalid endpoint indices');
const signatures = new Set(levels.map(level => {
  const degrees = level.nodes.map((_, index) => level.edges.filter(edge => edge.includes(index)).length).sort((a, b) => a - b);
  return level.nodes.length + ':' + level.edges.length + ':' + degrees.join(',');
}));
assert.ok(signatures.size >= 8, 'The campaign must include a variety of graph structures');
console.log('PASS ' + checks + ' witnessed moves: conservation, distance bounds, simultaneous goals, immutable history, private replay certificates, difficulty order, and ' + signatures.size + ' graph signatures.');
