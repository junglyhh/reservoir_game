import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialWeights, averageEdge, goalsMet, distances, validateLevel } from './docs/engine.js';

const levels = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
assert.equal(levels.length, 10);
assert.equal(new Set(levels.map(level => level.id)).size, 10);
let checks = 0;
for (const level of levels) {
  assert.deepEqual(validateLevel(level), [], 'Invalid level ' + level.id);
  const limits = distances(level).map(distance => 100 / (distance + 1));
  let weights = initialWeights(level);
  const snapshots = [];
  assert.equal(goalsMet(level, weights), false);
  for (const edgeIndex of level.solution) {
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
  console.log('PASS level ' + level.id + ': ' + level.name + ' (' + snapshots.length + '/' + level.budget + ' moves)');
}
const fork = levels[3];
let greedy = initialWeights(fork);
for (const edge of [0, 1, 0, 1, 2]) greedy = averageEdge(greedy, fork.edges[edge]);
assert.equal(goalsMet(fork, greedy), false, 'Greedy allocation must not satisfy both targets');
console.log('PASS ' + checks + ' witnessed moves: conservation, distance bounds, simultaneous goals, immutable history, and replay certificates.');
