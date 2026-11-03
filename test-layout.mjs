import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { layoutGarden } from './docs/layout.js';
import { nearestEdgeAt } from './docs/touch.js';

const levels = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
// CSS-pixel board sizes: narrow portrait, common phones, short landscape, desktop.
const sizes = [[296, 280], [351, 307], [366, 430], [390, 430], [470, 210], [600, 250], [850, 440]];
let configurations = 0;
for (const [width, height] of sizes) {
  for (const level of levels) {
    const { size, positions } = layoutGarden(level, width, height);
    assert.ok(size >= 40, 'Values remain legible');
    for (const [index, node] of positions.entries()) {
      assert.ok(node.x - size / 2 >= 0 && node.x + size / 2 <= width, 'Vessel fits horizontally');
      assert.ok(node.y - size / 2 >= 0 && node.y + size / 2 + 40 <= height, 'Vessel and labels fit vertically');
      positions.slice(index + 1).forEach(other => {
        assert.ok(Math.hypot(other.x - node.x, other.y - node.y) >= size + 5, 'Vessels must not overlap at ' + width + 'x' + height + ', level ' + level.id);
      });
    }
    level.edges.forEach(([a, b], edgeIndex) => {
      const middle = { x: (positions[a].x + positions[b].x) / 2, y: (positions[a].y + positions[b].y) / 2 };
      assert.equal(nearestEdgeAt(middle, level.edges, positions, size / 2, 24), edgeIndex, 'Every pipe midpoint remains tappable');
    });
    configurations++;
  }
}
console.log('PASS ' + configurations + ' real layout configurations: visible labels, separate vessels, and tappable edges in portrait, landscape, and desktop.');
