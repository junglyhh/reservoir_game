import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { layoutGarden, minimumBoardHeight, placeNodeLabels } from './docs/layout.js';
import { nearestEdgeAt } from './docs/touch.js';

const levels = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
// CSS-pixel board sizes: narrow portrait, common phones, short landscape, desktop.
const sizes = [[296, 280], [351, 307], [366, 430], [390, 430], [470, 210], [600, 250], [850, 440], [360, 280], [439, 280], [440, 210]];
let configurations = 0;
let labelConfigurations = 0;
for (const [width, requestedHeight] of sizes) {
  for (const level of levels) {
    const height = Math.max(requestedHeight, minimumBoardHeight(level, width));
    const layout = layoutGarden(level, width, height);
    const { size, positions, outerRadii } = layout;
    assert.ok(size >= 40, 'Values remain legible');
    for (const [index, node] of positions.entries()) {
      const radius = outerRadii[index];
      assert.ok(node.x - radius >= 0 && node.x + radius <= width, 'The entire petal frame fits horizontally');
      assert.ok(node.y - radius >= 0 && node.y + radius <= height, 'The entire petal frame fits vertically');
      positions.slice(index + 1).forEach((other, offset) => {
        assert.ok(Math.hypot(other.x - node.x, other.y - node.y) >= radius + outerRadii[index + offset + 1] + 4.9, 'Petal frames must stay separate at ' + width + 'x' + height + ', level ' + level.id);
      });
    }
    level.edges.forEach(([a, b], edgeIndex) => {
      const middle = { x: (positions[a].x + positions[b].x) / 2, y: (positions[a].y + positions[b].y) / 2 };
      assert.equal(nearestEdgeAt(middle, level.edges, positions, outerRadii, 24), edgeIndex, 'Every pipe midpoint remains tappable outside the complete flower frames');
    });
    // Conservative text boxes cover both language lengths and the widest
    // minimum badge, including the checkmark that appears when it is met.
    // Runtime placement uses actual DOM measurements instead of these boxes.
    for (const language of ['en', 'zh']) {
      const measurements = level.nodes.map((node, index) => ({
        nameWidth: node.goal !== undefined ? (language === 'en' ? 68 : 48) : index === level.root ? (language === 'en' ? 68 : 44) : 12,
        nameHeight: 14,
        goalWidth: node.goal !== undefined ? 78 : index === level.root ? (language === 'en' ? 84 : 48) : (language === 'en' ? 52 : 36),
        goalHeight: node.goal !== undefined ? 20 : 14
      }));
      const labels = placeNodeLabels(level, layout, width, height, measurements);
      for (const [index, label] of labels.entries()) {
        const box = label.bounds;
        const context = ', level ' + level.id + ', ' + width + 'x' + height + ', ' + language;
        assert.ok(box.left >= 4 && box.right <= width - 4 && box.top >= 4 && box.bottom <= height - 4, 'Labels fit inside the board' + context);
        assert.equal(label.name.y + measurements[index].nameHeight + 3, label.goal.y, 'Keep each name attached to its minimum');
        positions.forEach((point, other) => {
          const distance = Math.hypot(point.x - Math.max(box.left, Math.min(box.right, point.x)), point.y - Math.max(box.top, Math.min(box.bottom, point.y)));
          assert.ok(distance >= outerRadii[other] + 2.999, 'Labels must not cover a vessel or petal frame' + context);
          if (other === index) assert.ok(distance <= outerRadii[other] + 12, 'Keep labels close to their own node' + context);
        });
        labels.slice(index + 1).forEach(other => {
          const x = Math.min(box.right, other.bounds.right) - Math.max(box.left, other.bounds.left);
          const y = Math.min(box.bottom, other.bounds.bottom) - Math.max(box.top, other.bounds.top);
          assert.ok(x <= 0 || y <= 0, 'Node labels must not overlap' + context);
        });
      }
      labelConfigurations++;
    }
    configurations++;
  }
}
console.log('PASS ' + configurations + ' responsive board configurations and ' + labelConfigurations + ' bilingual label layouts: visible petal frames, nearby minimum badges, no frame/label collisions, and tappable edges.');
