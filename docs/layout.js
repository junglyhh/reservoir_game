/** Fit the graph in CSS pixels while retaining room between vessels and pipes. */
export function layoutGarden(level, width, height) {
  const crowded = level.nodes.length >= 5;
  let size = width < 360 && crowded ? 44 : width < 420 ? 56 : width < 620 ? 66 : level.nodes.length > 6 ? 76 : 86;
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
  return { size, positions, compact: size <= 48 };
}
