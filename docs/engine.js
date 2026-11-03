export function initialWeights(level) {
  return level.nodes.map((_, index) => index === level.root ? 100 : 0);
}

export function averageEdge(weights, edge) {
  const next = weights.slice();
  const value = (weights[edge[0]] + weights[edge[1]]) / 2;
  next[edge[0]] = value;
  next[edge[1]] = value;
  return next;
}

export function goalsMet(level, weights) {
  return level.nodes.every((node, index) => node.goal === undefined || weights[index] >= node.goal);
}

export function distances(level) {
  const result = level.nodes.map(() => Infinity);
  result[level.root] = 0;
  const queue = [level.root];
  for (const current of queue) {
    for (const [a, b] of level.edges) {
      const next = a === current ? b : b === current ? a : -1;
      if (next >= 0 && result[next] === Infinity) {
        result[next] = result[current] + 1;
        queue.push(next);
      }
    }
  }
  return result;
}

export function validateLevel(level) {
  const errors = [];
  if (!Number.isInteger(level.root) || !level.nodes[level.root]) errors.push('Invalid root');
  if (!Number.isInteger(level.budget) || level.budget < 1) errors.push('Invalid move budget');
  if (!Number.isInteger(level.par) || level.par < 1 || level.par > level.budget) errors.push('Invalid par');
  if (!level.nodes.some(node => node.goal > 0)) errors.push('No target');
  if (!level.edges.every(edge => edge.length === 2 && edge.every(index => Number.isInteger(index) && !!level.nodes[index]) && edge[0] !== edge[1])) errors.push('Invalid edge');
  if (errors.length) return errors;
  const distance = distances(level);
  if (distance.some(value => !Number.isFinite(value))) errors.push('Disconnected graph');
  level.nodes.forEach((node, index) => {
    if (node.goal !== undefined && (!(node.goal > 0) || node.goal > 100 / (distance[index] + 1))) errors.push('Invalid target threshold');
    if (![node.x, node.y].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) errors.push('Invalid layout');
  });
  if (!Array.isArray(level.solution) || level.solution.length > level.par) errors.push('Missing par solution');
  else {
    let state = initialWeights(level);
    for (const edgeIndex of level.solution) {
      if (!level.edges[edgeIndex]) { errors.push('Invalid solution edge'); break; }
      state = averageEdge(state, level.edges[edgeIndex]);
    }
    if (!goalsMet(level, state)) errors.push('Unsolvable witness');
  }
  return errors;
}
