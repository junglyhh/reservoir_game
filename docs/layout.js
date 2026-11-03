// This is also the maximum radial reach of the six ellipses in petal-frames.css.
export function petalReach(size) {
  return Math.min(12, Math.max(6, size * .14));
}

// A dense garden needs enough vertical room for readable target labels. This
// depends only on width and graph size, so setting min-height cannot oscillate
// in a ResizeObserver callback. Sparse gardens keep their existing height.
export function minimumBoardHeight(level, width) {
  const count = level.nodes.length;
  if (count < 5) return 0;
  if (width < 360) return count === 5 ? 350 : count === 6 ? 380 : 400;
  if (width < 440) return count === 5 ? 350 : 430;
  return 260;
}

/** Fit the graph in CSS pixels while retaining room between vessels and pipes. */
export function layoutGarden(level, width, height) {
  const crowded = level.nodes.length >= 5;
  let size = width < 360 && crowded ? 44 : width < 420 ? 56 : width < 620 ? 66 : level.nodes.length > 6 ? 76 : 86;
  if (width < 480 && crowded) size = Math.min(size, 56);
  if (height < 320 && crowded) size = Math.min(size, 52);
  const place = diameter => level.nodes.map(node => ({
    x: Math.max(diameter / 2 + 11, Math.min(width - diameter / 2 - 11, node.x * width / 100)),
    y: Math.max(diameter / 2 + 20, Math.min(height - 80, node.y * (height - 65) / 100 + 15))
  }));
  let positions = place(size);
  let pairDistance = Infinity;
  let edgeDistance = Infinity;
  positions.forEach((one, i) => positions.slice(i + 1).forEach(two => {
    pairDistance = Math.min(pairDistance, Math.hypot(one.x - two.x, one.y - two.y));
  }));
  level.edges.forEach(([a, b]) => {
    edgeDistance = Math.min(edgeDistance, Math.hypot(positions[a].x - positions[b].x, positions[a].y - positions[b].y));
  });
  size = Math.max(40, Math.floor(Math.min(size, pairDistance - 14, edgeDistance - 28)));
  positions = place(size);
  const frameReach = petalReach(size);
  const outerRadii = level.nodes.map(node => size / 2 + (node.goal !== undefined ? frameReach : 0));
  const connected = new Set(level.edges.map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join(':')));
  const keepInside = () => positions.forEach((point, index) => {
    const margin = outerRadii[index] + 8;
    point.x = Math.max(margin, Math.min(width - margin, point.x));
    point.y = Math.max(margin, Math.min(height - margin, point.y));
  });
  // The original composition is retained. Only tight pairs are separated far
  // enough for petals and a visible pipe control, generally by a few pixels.
  keepInside();
  for (let pass = 0; pass < 64; pass++) {
    let largest = 0;
    for (let a = 0; a < positions.length; a++) for (let b = a + 1; b < positions.length; b++) {
      const one = positions[a], two = positions[b];
      const dx = two.x - one.x, dy = two.y - one.y;
      const distance = Math.hypot(dx, dy) || 1;
      const gap = connected.has(a + ':' + b) ? 24 : 5;
      const missing = outerRadii[a] + outerRadii[b] + gap - distance;
      if (missing <= 0) continue;
      largest = Math.max(largest, missing);
      const shift = (missing + .02) / 2;
      one.x -= dx / distance * shift; one.y -= dy / distance * shift;
      two.x += dx / distance * shift; two.y += dy / distance * shift;
    }
    keepInside();
    if (largest < .02) break;
  }
  return { size, positions, compact: size <= 48, frameReach, outerRadii };
}

function rectangleOverlap(one, two, gap = 0) {
  return Math.max(0, Math.min(one.right, two.right) - Math.max(one.left, two.left) + gap) *
    Math.max(0, Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top) + gap);
}

function distanceToRectangle(point, rectangle) {
  return Math.hypot(point.x - Math.max(rectangle.left, Math.min(rectangle.right, point.x)),
    point.y - Math.max(rectangle.top, Math.min(rectangle.bottom, point.y)));
}

function edgeInsideRectangle(one, two, rectangle) {
  const dx = two.x - one.x, dy = two.y - one.y;
  let first = 0, last = 1;
  for (const [p, q] of [[-dx, one.x - rectangle.left], [dx, rectangle.right - one.x], [-dy, one.y - rectangle.top], [dy, rectangle.bottom - one.y]]) {
    if (p === 0) { if (q < 0) return 0; continue; }
    const fraction = q / p;
    if (p < 0) first = Math.max(first, fraction);
    else last = Math.min(last, fraction);
    if (first > last) return 0;
  }
  return Math.max(0, last - first) * Math.hypot(dx, dy);
}

/** Place measured name/minimum stacks without covering a vessel or petal frame.
 * All coordinates are relative to the board. The caller uses the returned name
 * and goal top-left points with transform:none, and can keep its actual label
 * bounds for positioning pipe controls. No language-specific widths are assumed.
 */
export function placeNodeLabels(level, layout, width, height, measurements) {
  const { positions, outerRadii } = layout;
  const options = measurements.map((measure, index) => {
    const point = positions[index], radius = outerRadii[index];
    const boxWidth = Math.max(measure.nameWidth, measure.goalWidth);
    const boxHeight = measure.nameHeight + 3 + measure.goalHeight;
    const candidates = [];
    const add = (left, top, preference) => {
      left = Math.max(4, Math.min(width - boxWidth - 4, left));
      top = Math.max(4, Math.min(height - boxHeight - 4, top));
      const box = { left, top, right: left + boxWidth, bottom: top + boxHeight };
      const infringement = positions.reduce((sum, node, i) => sum + Math.max(0, outerRadii[i] + 3 - distanceToRectangle(node, box)), 0);
      const crossedPipes = level.edges.reduce((sum, [a, b]) => sum + edgeInsideRectangle(positions[a], positions[b], box), 0);
      const separation = distanceToRectangle(point, box);
      candidates.push({ box, measure, index, cost: infringement * 1e6 + crossedPipes * 2 + preference + Math.max(0, separation - radius - 3) * 8, infringement });
    };
    for (const shift of [0, -12, 12, -24, 24, -36, 36, -48, 48]) {
      const offsetCost = Math.abs(shift) * .05;
      add(point.x - boxWidth / 2 + shift, point.y + radius + 3, offsetCost);
      add(point.x - boxWidth / 2 + shift, point.y - radius - 3 - boxHeight, 6 + offsetCost);
      add(point.x + radius + 3, point.y - boxHeight / 2 + shift, 8 + offsetCost);
      add(point.x - radius - 3 - boxWidth, point.y - boxHeight / 2 + shift, 8 + offsetCost);
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const radial = (radius + 4) / Math.SQRT2;
      add(point.x + sx * radial - (sx < 0 ? boxWidth : 0), point.y + sy * radial - (sy < 0 ? boxHeight : 0), 10);
    }
    // Closely stacked targets sometimes need a small diagonal offset instead
    // of a cardinal label position. Keep a local grid as a bounded fallback.
    for (let dx = -96; dx <= 96; dx += 12) for (let dy = -96; dy <= 96; dy += 12) {
      add(point.x + dx - boxWidth / 2, point.y + dy - boxHeight / 2, 12);
    }
    const clear = candidates.filter(candidate => candidate.infringement < .001);
    const directions = Array.from({ length: 8 }, () => []);
    for (const candidate of (clear.length ? clear : candidates).sort((a, b) => a.cost - b.cost)) {
      const box = candidate.box;
      const angle = Math.atan2((box.top + box.bottom) / 2 - point.y, (box.left + box.right) / 2 - point.x);
      const direction = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
      if (directions[direction].length < 8 && !directions[direction].some(prior => Math.abs(prior.box.left - box.left) < 1 && Math.abs(prior.box.top - box.top) < 1)) directions[direction].push(candidate);
    }
    return directions.flat().sort((a, b) => a.cost - b.cost);
  });
  // A small bounded beam accounts for neighbouring labels as a group. This
  // avoids a greedy choice using the sole free position of a later target.
  const order = options.map((choices, index) => ({ index, choices })).sort((a, b) => a.choices.length - b.choices.length || a.index - b.index);
  let beam = [{ cost: 0, placed: [] }];
  for (const { choices } of order) {
    const next = [];
    for (const state of beam) for (const choice of choices) {
      const overlap = state.placed.reduce((sum, prior) => sum + rectangleOverlap(choice.box, prior.box, 3), 0);
      next.push({ cost: state.cost + choice.cost + overlap * 1000, placed: [...state.placed, choice] });
    }
    next.sort((a, b) => a.cost - b.cost);
    beam = next.slice(0, 64);
  }
  return beam[0].placed.sort((a, b) => a.index - b.index).map(({ box, measure }) => ({
    name: { x: box.left + (box.right - box.left - measure.nameWidth) / 2, y: box.top },
    goal: { x: box.left + (box.right - box.left - measure.goalWidth) / 2, y: box.top + measure.nameHeight + 3 },
    bounds: box
  }));
}
