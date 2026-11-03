import { initialWeights, averageEdge, goalsMet } from './engine.js';

const milestoneOrder = ['ten', 'twenty', 'final', 'mastered'];

export function isRecord(record, level) {
  return !!record && Number.isInteger(record.moves) && record.moves > 0 && (!level || record.moves <= level.budget);
}

export function completionTotals(levels, records = {}) {
  const completed = levels.filter(level => isRecord(records[level.id], level));
  return {
    completed: completed.length,
    gold: completed.filter(level => records[level.id].moves <= level.par).length,
    total: levels.length
  };
}

// A completion earns the next garden, whether or not it earned a golden bloom.
// Older saves may contain later victories; gaps still have to be cleared.
export function highestUnlockedIndex(levels, records = {}) {
  if (!levels.length) return -1;
  const firstUncleared = levels.findIndex(level => !isRecord(records[level.id], level));
  return firstUncleared < 0 ? levels.length - 1 : firstUncleared;
}

export function isLevelUnlocked(levels, records, index) {
  return Number.isInteger(index) && index >= 0 && index < levels.length && index <= highestUnlockedIndex(levels, records);
}

export function currentIndexForProgress(levels, progress) {
  const requested = levels.findIndex(level => level.id === progress.currentId);
  return isLevelUnlocked(levels, progress.records, requested) ? requested : Math.max(0, highestUnlockedIndex(levels, progress.records));
}

export function pendingMilestones(progress, levels) {
  const { completed, gold, total } = completionTotals(levels, progress.records);
  if (!total) return [];
  const firstUncleared = levels.findIndex(level => !isRecord(progress.records[level.id], level));
  const clearedPrefix = firstUncleared < 0 ? total : firstUncleared;
  const eligible = {
    ten: clearedPrefix >= 10,
    twenty: clearedPrefix >= 20,
    final: completed === total && gold < total,
    mastered: gold === total
  };
  const seen = progress.milestonesSeen || {};
  const prior = Array.isArray(progress.milestonesPending) ? progress.milestonesPending : [];
  // Keep an earned final-challenge announcement if the player earns the last
  // gold before dismissing it; newly perfect campaigns skip that announcement.
  return milestoneOrder.filter(kind => !seen[kind] && (
    eligible[kind] || kind === 'final' && completed === total && prior.includes(kind)
  ));
}

export function acknowledgeMilestone(progress, kind) {
  if (!milestoneOrder.includes(kind) || !progress.milestonesPending.includes(kind)) return progress;
  return {
    ...progress,
    milestonesSeen: { ...progress.milestonesSeen, [kind]: true },
    milestonesPending: progress.milestonesPending.filter(item => item !== kind)
  };
}

export function recordCompletion(progress, levels, index, moves) {
  if (!isLevelUnlocked(levels, progress.records, index)) return progress;
  const level = levels[index];
  if (!isRecord({ moves }, level)) return progress;
  const previous = progress.records[level.id];
  const next = {
    ...progress,
    records: {
      ...progress.records,
      [level.id]: { moves: isRecord(previous, level) ? Math.min(previous.moves, moves) : moves }
    }
  };
  next.milestonesPending = pendingMilestones(next, levels);
  return next;
}

export function normalizeProgress(stored, levels) {
  const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const records = Object.fromEntries(levels.filter(level => isRecord(source.records?.[level.id], level)).map(level => [level.id, { moves: source.records[level.id].moves }]));
  const modern = source.campaignVersion === 2;
  const oldLevelId = index => Number.isInteger(index) && index >= 0 && index < 10 ? index + 1 : null;
  const requestedId = modern ? source.currentId : oldLevelId(source.current);
  const active = source.active && typeof source.active === 'object' ? source.active : null;
  const activeId = active ? (modern ? active.levelId : oldLevelId(active.level)) : null;
  const progress = {
    campaignVersion: 2,
    records,
    currentId: requestedId ?? levels[0]?.id ?? null,
    sound: source.sound === true,
    active: active ? { levelId: activeId, weights: active.weights, history: active.history, hintStep: Number.isInteger(active.hintStep) ? Math.max(-1, Math.min(1, active.hintStep)) : -1 } : null,
    milestonesSeen: Object.fromEntries(milestoneOrder.filter(kind => modern && source.milestonesSeen?.[kind] === true).map(kind => [kind, true])),
    milestonesPending: modern && Array.isArray(source.milestonesPending) ? source.milestonesPending.filter(kind => milestoneOrder.includes(kind)) : []
  };
  const index = currentIndexForProgress(levels, progress);
  progress.currentId = levels[index]?.id ?? null;
  if (progress.active?.levelId !== progress.currentId) progress.active = null;
  progress.milestonesPending = pendingMilestones(progress, levels);
  return progress;
}

export function isValidResume(active, level) {
  const validWeights = candidate => Array.isArray(candidate) && candidate.length === level.nodes.length && candidate.every(value => Number.isFinite(value) && value >= 0 && value <= 100) && Math.abs(candidate.reduce((sum, value) => sum + value, 0) - 100) < 1e-8;
  if (!active || active.levelId !== level.id || !validWeights(active.weights) || !Array.isArray(active.history) || active.history.length > level.budget || !active.history.every(validWeights)) return false;
  const snapshots = [...active.history, active.weights];
  if (!snapshots[0].every((value, index) => value === initialWeights(level)[index])) return false;
  for (let step = 0; step < snapshots.length - 1; step++) {
    if (goalsMet(level, snapshots[step])) return false;
    if (!level.edges.some(edge => snapshots[step][edge[0]] !== snapshots[step][edge[1]] && averageEdge(snapshots[step], edge).every((value, index) => value === snapshots[step + 1][index]))) return false;
  }
  return true;
}
