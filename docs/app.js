import { initialWeights, averageEdge, goalsMet, validateLevel } from './engine.js';
import { installBoardTouch } from './touch.js?v=petal-bull-1';
import { layoutGarden, minimumBoardHeight, placeNodeLabels } from './layout.js?v=petal-bull-1';
import { t, moveCount, translateLevel, getLanguage, setLanguage, applyStaticTranslations } from './i18n.js?v=petal-bull-1';
import { isRecord, completionTotals, highestUnlockedIndex, isLevelUnlocked, currentIndexForProgress, pendingMilestones, acknowledgeMilestone, recordCompletion, normalizeProgress, isValidResume } from './progression.js';

const $ = id => document.getElementById(id);
const storageKey = 'a-share-of-light-progress-v1';
// Read the previous save key so returning players retain their progress.
const legacyStorageKey = 'liquid-light-garden-v1';
const svgNS = 'http://www.w3.org/2000/svg';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const icons = name => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
let levels = [];
let current = 0;
let weights = [];
let history = [];
let positions = [];
let nodeRadii = [];
let nodeElements = [];
let pipeElements = [];
let lineElements = [];
let busy = false;
let animationToken = 0;
let hintStep = -1;
let soundEnabled = false;
let audioContext;
let storageAvailable = true;
let toastTimer;
let toastMessage;
let loadFailed = false;
let storedProgress = null;
let progress = normalizeProgress(null, []);
let activeMilestone = null;
let milestoneTimer;

function readProgress() {
  try {
    storedProgress = JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey) ?? 'null');
  } catch { storageAvailable = false; }
  soundEnabled = storedProgress?.sound === true;
}

function saveProgress() {
  progress.currentId = levels[current]?.id ?? null;
  progress.sound = soundEnabled;
  progress.active = { levelId: progress.currentId, weights, history, hintStep };
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
  catch { storageAvailable = false; }
  renderSaveNote();
}

function renderSaveNote() {
  $('save-note').innerHTML = '<span></span>' + t(storageAvailable ? 'save.saved' : 'save.session');
}

function format(value) {
  const rounded = Math.floor(value * 1000 + 1e-8) / 1000;
  return String(rounded) + '%';
}

function completedCount() {
  return completionTotals(levels, progress.records).completed;
}

function closeDialogs() {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
}

function openDialog(id) {
  closeDialogs();
  $(id).showModal();
}

function toast(key, parameters = {}) {
  clearTimeout(toastTimer);
  toastMessage = { key, parameters };
  $('toast').textContent = t(key, parameters);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; toastMessage = null; }, 2800);
}

function renderLevelText() {
  const level = translateLevel(levels[current]);
  const targets = level.nodes.filter(node => node.goal !== undefined);
  $('level-eyebrow').textContent = t('level.eyebrow', {
    number: String(current + 1).padStart(2, '0'),
    total: levels.length,
    chapter: (level.chapter || t('level.defaultChapter')).toUpperCase()
  });
  $('level-title').textContent = level.name;
  $('level-description').textContent = level.subtitle;
  $('difficulty-badge').textContent = t('difficulty.' + level.difficulty).toUpperCase();
  $('difficulty-badge').dataset.difficulty = level.difficulty.toLowerCase();
  $('objective-title').textContent = t(targets.length === 1 ? 'objective.singleTitle' : targets.length === 2 ? 'objective.doubleTitle' : 'objective.multiTitle');
  $('objective-copy').textContent = t(targets.length === 1 ? 'objective.single' : 'objective.multiple', { moves: moveCount(level.budget), count: targets.length });
  $('par-copy').innerHTML = icons('star') + ' ' + t('par', { moves: moveCount(level.par) });
  document.querySelectorAll('.target-row').forEach(row => {
    const node = level.nodes[Number(row.dataset.target)];
    row.querySelector('.target-name').textContent = t('target.name', { label: node.label });
  });
}

function refreshLanguage() {
  applyStaticTranslations();
  updateSoundButton();
  renderSaveNote();
  if (levels[current]) {
    renderLevelText();
    render();
    renderNavigation();
    renderHint();
    renderCompletionStats();
    if (activeMilestone) renderMilestone();
    layoutBoard();
  } else if (loadFailed) {
    renderLoadError();
  }
  if (toastMessage) $('toast').textContent = t(toastMessage.key, toastMessage.parameters);
}

function loadLevel(index, resume = false) {
  if (!levels[index]) return false;
  if (!isLevelUnlocked(levels, progress.records, index)) {
    toast('toast.locked', { number: index });
    return false;
  }
  animationToken++;
  busy = false;
  current = index;
  const level = levels[current];
  const active = progress.active;
  weights = initialWeights(level);
  history = [];
  hintStep = -1;
  if (resume && isValidResume(active, level)) {
    weights = active.weights.slice();
    history = active.history.map(state => state.slice());
    hintStep = Number.isInteger(active.hintStep) ? Math.max(-1, Math.min(1, active.hintStep)) : -1;
  }
  if (goalsMet(level, weights)) recordVictory();
  $('target-list').replaceChildren();
  level.nodes.forEach((node, index) => {
    if (node.goal === undefined) return;
    const row = document.createElement('div');
    row.className = 'target-row';
    row.dataset.target = index;
    row.innerHTML = '<span class="target-symbol">' + icons('leaf') + '</span><div class="target-details"><div class="target-line"><span class="target-name"></span><span class="target-amount"></span></div><div class="target-bar"><span></span></div><span class="target-goal"></span></div>';
    row.querySelector('.target-name').textContent = t('target.name', { label: node.label });
    row.querySelector('.target-goal').textContent = t('target.minimum', { goal: format(node.goal) });
    row.querySelector('.target-goal').dataset.goal = format(node.goal);
    $('target-list').append(row);
  });
  renderLevelText();
  $('move-dots').innerHTML = Array.from({ length: level.budget }, () => '<span></span>').join('');
  buildBoard();
  render();
  renderNavigation();
  renderHint();
  saveProgress();
  scheduleMilestone();
  return true;
}

function buildBoard() {
  const level = levels[current];
  $('nodes-layer').replaceChildren();
  $('pipes-layer').replaceChildren();
  $('particles-layer').replaceChildren();
  $('network').innerHTML = '<defs><linearGradient id="pipe-gradient"><stop offset="0%" stop-color="#71a587"/><stop offset="50%" stop-color="#1e6146"/><stop offset="100%" stop-color="#71a587"/></linearGradient><filter id="light-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>';
  nodeElements = level.nodes.map((node, index) => {
    const el = document.createElement('div');
    const target = node.goal !== undefined;
    el.className = 'reservoir' + (index === level.root ? ' source' : '') + (target ? ' target' : '');
    el.dataset.node = index;
    el.setAttribute('role', 'img');
    el.innerHTML = '<div class="node-aura"></div>' + (target ? '<div class="petals" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>' : '') + '<div class="glass-vessel"><div class="liquid"><div class="liquid-surface"></div></div><div class="vessel-glint"></div><span class="node-value"></span>' + (target ? '<span class="goal-line" style="bottom:' + node.goal + '%"></span>' : '') + '</div><span class="node-label"></span><span class="node-goal"></span><span class="node-preview" hidden></span>';
    el.querySelector('.node-label').textContent = index === level.root ? t('node.source', { label: node.label }) : target ? t('node.bloom', { label: node.label }) : node.label;
    el.querySelector('.node-goal').textContent = target ? t('node.minimum', { goal: format(node.goal) }) : t(index === level.root ? 'node.firstDrop' : 'node.junction');
    $('nodes-layer').append(el);
    return el;
  });
  lineElements = [];
  pipeElements = level.edges.map((edge, index) => {
    const group = document.createElementNS(svgNS, 'g');
    group.dataset.edge = index;
    for (const className of ['pipe-shadow', 'pipe-line', 'pipe-highlight', 'pipe-hit']) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('class', className);
      group.append(line);
    }
    group.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') preview(index); });
    group.addEventListener('pointerleave', clearPreview);
    $('network').append(group);
    lineElements.push(group);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pipe-control';
    button.dataset.edge = index;
    button.setAttribute('aria-label', t('edge.share', { a: level.nodes[edge[0]].label, b: level.nodes[edge[1]].label }));
    button.innerHTML = '<span class="pipe-dot">' + icons('swap') + '</span>';
    button.addEventListener('click', () => takeMove(index));
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') preview(index); });
    button.addEventListener('pointerleave', clearPreview);
    button.addEventListener('focus', () => preview(index));
    button.addEventListener('blur', clearPreview);
    $('pipes-layer').append(button);
    return button;
  });
  layoutBoard();
}

function layoutBoard() {
  if (!levels[current] || !nodeElements.length) return;
  const board = $('garden-board');
  const width = board.clientWidth;
  board.style.minHeight = minimumBoardHeight(levels[current], width) + 'px';
  const height = board.clientHeight;
  if (!width || !height) return;
  const layout = layoutGarden(levels[current], width, height);
  const { compact, size } = layout;
  board.classList.toggle('compact-nodes', compact);
  board.style.setProperty('--node-size', size + 'px');
  $('network').setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  positions = layout.positions;
  nodeRadii = layout.outerRadii;
  nodeElements.forEach((node, index) => {
    node.style.left = positions[index].x + 'px';
    node.style.top = positions[index].y + 'px';
  });
  const measurements = nodeElements.map(node => {
    const name = node.querySelector('.node-label').getBoundingClientRect();
    const goal = node.querySelector('.node-goal').getBoundingClientRect();
    return { nameWidth: name.width, nameHeight: name.height, goalWidth: goal.width, goalHeight: goal.height };
  });
  const labels = placeNodeLabels(levels[current], layout, width, height, measurements);
  nodeElements.forEach((node, index) => {
    for (const [selector, point] of [['.node-label', labels[index].name], ['.node-goal', labels[index].goal]]) {
      const label = node.querySelector(selector);
      label.style.left = (point.x - positions[index].x + size / 2) + 'px';
      label.style.top = (point.y - positions[index].y + size / 2) + 'px';
      label.style.transform = 'none';
    }
  });
  const boardBounds = board.getBoundingClientRect();
  const labelBounds = nodeElements.flatMap(node => ['.node-label', '.node-goal'].map(selector => {
    const rect = node.querySelector(selector).getBoundingClientRect();
    return { left: rect.left - boardBounds.left - 3, top: rect.top - boardBounds.top - 3, right: rect.right - boardBounds.left + 3, bottom: rect.bottom - boardBounds.top + 3 };
  }));
  const controls = [];
  levels[current].edges.forEach(([a, b], index) => {
    lineElements[index].querySelectorAll('line').forEach(line => {
      line.setAttribute('x1', positions[a].x);
      line.setAttribute('y1', positions[a].y);
      line.setAttribute('x2', positions[b].x);
      line.setAttribute('y2', positions[b].y);
    });
    const candidates = [.5, .62, .38, .7, .3].map(fraction => {
      const point = { x: positions[a].x + (positions[b].x - positions[a].x) * fraction, y: positions[a].y + (positions[b].y - positions[a].y) * fraction };
      let cost = Math.abs(.5 - fraction);
      for (const label of labelBounds) {
        const overlapX = Math.max(0, Math.min(point.x + 13, label.right) - Math.max(point.x - 13, label.left));
        const overlapY = Math.max(0, Math.min(point.y + 13, label.bottom) - Math.max(point.y - 13, label.top));
        cost += overlapX * overlapY * 5;
      }
      positions.forEach((node, nodeIndex) => {
        cost += Math.max(0, layout.outerRadii[nodeIndex] + 14 - Math.hypot(point.x - node.x, point.y - node.y)) * 40;
      });
      for (const other of controls) cost += Math.max(0, 45 - Math.hypot(point.x - other.x, point.y - other.y)) * 25;
      return { ...point, cost };
    });
    candidates.sort((one, two) => one.cost - two.cost);
    controls.push(candidates[0]);
    pipeElements[index].style.left = candidates[0].x + 'px';
    pipeElements[index].style.top = candidates[0].y + 'px';
  });
}

function render() {
  const level = levels[current];
  const won = goalsMet(level, weights);
  const exhausted = history.length >= level.budget && !won;
  document.querySelector('.game-panel').classList.toggle('is-won', won);
  document.querySelector('.game-panel').classList.toggle('is-exhausted', exhausted);
  nodeElements.forEach((el, index) => {
    const node = level.nodes[index];
    const lit = node.goal !== undefined && weights[index] >= node.goal;
    el.style.setProperty('--fill', weights[index] + '%');
    el.style.setProperty('--light', Math.sqrt(weights[index] / 100));
    el.classList.toggle('lit', lit);
    el.classList.toggle('high-fill', weights[index] >= 60);
    el.querySelector('.node-value').textContent = format(weights[index]);
    el.querySelector('.node-label').textContent = index === level.root ? t('node.source', { label: node.label }) : node.goal !== undefined ? t('node.bloom', { label: node.label }) : node.label;
    el.querySelector('.node-goal').textContent = node.goal !== undefined ? t(lit ? 'node.reached' : 'node.minimum', { goal: format(node.goal) }) : t(index === level.root ? 'node.firstDrop' : 'node.junction');
    el.setAttribute('aria-label', t('node.a11y', { label: node.label, amount: format(weights[index]) }) + (node.goal !== undefined ? t('node.goalA11y', { goal: format(node.goal), status: t(lit ? 'goal.met' : 'goal.unmet') }) : ''));
  });
  level.edges.forEach(([a, b], index) => {
    lineElements[index].style.setProperty('--pipe-light', 0.18 + 0.65 * Math.sqrt((weights[a] + weights[b]) / 200));
    pipeElements[index].disabled = busy || won || exhausted;
    pipeElements[index].setAttribute('aria-label', t('edge.share', { a: level.nodes[a].label, b: level.nodes[b].label }));
  });
  document.querySelectorAll('.target-row').forEach(row => {
    const index = Number(row.dataset.target);
    const goal = level.nodes[index].goal;
    const met = weights[index] >= goal;
    row.classList.toggle('met', met);
    row.querySelector('.target-amount').textContent = format(weights[index]);
    row.querySelector('.target-bar span').style.width = Math.min(100, weights[index] / goal * 100) + '%';
    row.querySelector('.target-goal').textContent = t(met ? 'target.reached' : 'target.minimum', { goal: format(goal) });
  });
  $('moves-used').textContent = history.length;
  $('moves-budget').textContent = level.budget;
  [...$('move-dots').children].forEach((dot, index) => { dot.className = index < history.length ? 'used' : 'remaining'; });
  $('undo-button').disabled = !history.length || busy;
  $('restart-button').disabled = false;
  $('total-light').textContent = format(weights.reduce((sum, weight) => sum + weight, 0));
  $('next-level').hidden = !won;
  $('next-level').innerHTML = t(current === levels.length - 1 ? 'next.explore' : 'next.garden') + icons('arrow');
  $('board-caption').className = 'board-caption' + (won ? ' win' : exhausted ? ' exhausted' : '');
  if (won) {
    const elegant = history.length <= level.par;
    $('caption-text').textContent = t(elegant ? 'caption.gold' : 'caption.won');
    $('status-note').innerHTML = icons(elegant ? 'star' : 'check') + '<span>' + t('status.won', { moves: moveCount(history.length) }) + '</span>';
  } else if (exhausted) {
    $('caption-text').textContent = t('caption.exhausted');
    $('status-note').textContent = t('status.exhausted');
  } else {
    $('caption-text').textContent = t(current === 0 && !history.length ? 'caption.first' : 'caption.play');
    $('status-note').textContent = history.length ? t('status.remaining', { moves: moveCount(level.budget - history.length) }) : '';
  }
  const record = progress.records[level.id];
  $('best-result').hidden = !isRecord(record);
  if (isRecord(record)) $('best-result').innerHTML = icons(record.moves <= level.par ? 'star' : 'check') + ' ' + t('best', { moves: moveCount(record.moves) });
}

function preview(index) {
  if (busy || !levels[current] || goalsMet(levels[current], weights) || history.length >= levels[current].budget) return;
  clearPreview();
  const [a, b] = levels[current].edges[index];
  const average = (weights[a] + weights[b]) / 2;
  lineElements[index].classList.add('active');
  for (const vertex of [a, b]) {
    nodeElements[vertex].classList.add('previewing');
    const label = nodeElements[vertex].querySelector('.node-preview');
    label.hidden = false;
    label.textContent = '→ ' + format(average);
  }
}

function clearPreview() {
  nodeElements.forEach(node => { node.classList.remove('previewing'); node.querySelector('.node-preview').hidden = true; });
  lineElements.forEach(line => line.classList.remove('active'));
}

function takeMove(index) {
  const level = levels[current];
  if (!level || !isLevelUnlocked(levels, progress.records, current) || busy || !level.edges[index] || goalsMet(level, weights) || history.length >= level.budget) return;
  clearPreview();
  const before = weights.slice();
  const [left, right] = level.edges[index];
  if (before[left] === before[right]) {
    toast('toast.balanced');
    return;
  }
  history.push(before);
  weights = averageEdge(weights, level.edges[index]);
  if (goalsMet(level, weights)) recordVictory();
  busy = true;
  const token = ++animationToken;
  render();
  saveProgress();
  playSound('move', index);
  animateTransfer(level.edges[index], before, token);
  setTimeout(() => {
    if (token !== animationToken) return;
    busy = false;
    if (goalsMet(level, weights)) finishLevel();
    else scheduleMilestone();
    render();
    saveProgress();
  }, reducedMotion.matches ? 20 : 180);
}

function animateTransfer([a, b], before, token) {
  if (reducedMotion.matches || before[a] === before[b]) return;
  const from = before[a] > before[b] ? positions[a] : positions[b];
  const to = before[a] > before[b] ? positions[b] : positions[a];
  const particles = Array.from({ length: 5 }, (_, i) => {
    const particle = document.createElement('span');
    particle.className = 'transfer-particle';
    particle.style.width = (3 + (i % 2) * 2) + 'px';
    particle.style.height = particle.style.width;
    $('particles-layer').append(particle);
    return particle;
  });
  const start = performance.now();
  function frame(now) {
    if (token !== animationToken) { particles.forEach(p => p.remove()); return; }
    const elapsed = (now - start) / 240;
    particles.forEach((particle, index) => {
      const t = Math.max(0, Math.min(1, elapsed * 1.45 - index * 0.09));
      particle.style.left = (from.x + (to.x - from.x) * t) + 'px';
      particle.style.top = (from.y + (to.y - from.y) * t) + 'px';
      particle.style.opacity = String(Math.sin(Math.PI * t));
    });
    if (elapsed < 1) requestAnimationFrame(frame);
    else particles.forEach(particle => particle.remove());
  }
  requestAnimationFrame(frame);
}

function recordVictory() {
  const level = levels[current];
  if (!goalsMet(level, weights)) return;
  progress = recordCompletion(progress, levels, current, history.length);
}

function finishLevel() {
  const level = levels[current];
  recordVictory();
  renderNavigation();
  playSound('win');
  if (!reducedMotion.matches) {
    nodeElements.filter((_, index) => level.nodes[index].goal !== undefined).forEach(node => {
      node.classList.remove('bloom-burst');
      void node.offsetWidth;
      node.classList.add('bloom-burst');
    });
  }
  scheduleMilestone(850);
}

function undo() {
  if (busy || !history.length) return;
  animationToken++;
  clearPreview();
  weights = history.pop();
  render();
  saveProgress();
  playSound('undo');
}

function restart() {
  const hint = hintStep;
  loadLevel(current);
  hintStep = hint;
  renderHint();
  saveProgress();
}

function miniGraph(level) {
  const lines = level.edges.map(([a, b]) => '<line x1="' + level.nodes[a].x + '" y1="' + level.nodes[a].y + '" x2="' + level.nodes[b].x + '" y2="' + level.nodes[b].y + '"/>').join('');
  const dots = level.nodes.map((node, i) => '<circle cx="' + node.x + '" cy="' + node.y + '" r="' + (node.goal !== undefined ? 5 : 3.5) + '" class="' + (i === level.root ? 'mini-source' : node.goal !== undefined ? 'mini-target' : '') + '"/>').join('');
  return '<svg class="level-mini" viewBox="0 0 100 100" aria-hidden="true">' + lines + dots + '</svg>';
}

function renderNavigation() {
  $('level-track').replaceChildren();
  $('level-grid').replaceChildren();
  levels.forEach((level, index) => {
    const text = translateLevel(level);
    const record = progress.records[level.id];
    const complete = isRecord(record);
    const mastered = complete && record.moves <= level.par;
    const locked = !isLevelUnlocked(levels, progress.records, index);
    const classes = (index === current ? ' active' : '') + (complete ? ' complete' : '') + (mastered ? ' mastered' : '') + (locked ? ' locked' : '');
    const step = document.createElement('button');
    step.type = 'button';
    step.className = 'level-step' + classes;
    step.disabled = locked;
    step.setAttribute('aria-disabled', String(locked));
    step.setAttribute('aria-label', t('nav.label', { number: index + 1, name: text.name, difficulty: t('difficulty.' + level.difficulty), status: locked ? t('nav.locked') : mastered ? t('nav.mastered') : complete ? t('nav.complete') : '' }));
    if (index === current) step.setAttribute('aria-current', 'step');
    step.title = locked ? t('nav.unlockHint', { number: index }) : text.name;
    step.innerHTML = '<span>' + String(index + 1).padStart(2, '0') + '</span>' + (locked ? '<span class="step-lock">' + icons('lock') + '</span>' : complete ? '<span class="step-flower">' + icons(mastered ? 'leaf' : 'check') + '</span>' : '');
    step.addEventListener('click', () => loadLevel(index));
    $('level-track').append(step);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'level-card' + classes;
    card.disabled = locked;
    card.setAttribute('aria-disabled', String(locked));
    card.innerHTML = '<span class="level-card-number">' + String(index + 1).padStart(2, '0') + '</span>' + miniGraph(level) + '<span class="level-card-title"></span><span class="level-card-meta"></span>' + (locked ? '<span class="level-card-lock">' + icons('lock') + '</span>' : complete ? '<span class="level-card-award">' + icons(mastered ? 'star' : 'check') + '</span>' : '');
    card.querySelector('.level-card-title').textContent = text.name;
    card.querySelector('.level-card-meta').textContent = locked ? t('nav.unlockHint', { number: index }) : t('nav.meta', { difficulty: t('difficulty.' + level.difficulty), moves: moveCount(level.budget) });
    card.setAttribute('aria-label', step.getAttribute('aria-label'));
    card.addEventListener('click', () => { closeDialogs(); loadLevel(index); });
    $('level-grid').append(card);
  });
  const count = completedCount();
  $('journey-progress').textContent = t('journey.progress', { count, total: levels.length });
}

function hintTexts() {
  const level = translateLevel(levels[current]);
  const hints = Array.isArray(level.hints) ? level.hints.slice(0, 2) : [level.hint];
  if (!hints[0]) hints[0] = t('hint.first');
  if (!hints[1]) hints[1] = t('hint.second');
  return hints;
}

function renderHint() {
  hintStep = Math.max(-1, Math.min(1, hintStep));
  const shown = hintStep >= 0;
  $('hint-box').hidden = !shown;
  $('hint-button').setAttribute('aria-expanded', String(shown));
  $('hint-button').querySelector('span').textContent = shown ? '−' : '+';
  if (shown) $('hint-copy').textContent = hintTexts()[hintStep];
  $('phone-hint-copy').textContent = hintTexts()[Math.max(0, hintStep)];
  $('hint-more').hidden = hintStep >= 1;
  $('phone-hint-more').hidden = hintStep >= 1;
  $('hint-more').innerHTML = t('hint.stronger') + ' <span>↗</span>';
  $('phone-hint-more').innerHTML = $('hint-more').innerHTML;
}

function renderMilestone() {
  if (!activeMilestone) return;
  const prefix = 'milestone.' + activeMilestone;
  $('completion-eyebrow').textContent = t(prefix + '.eyebrow');
  $('completion-title').textContent = t(prefix + '.title');
  $('completion-copy').textContent = t(prefix + '.copy');
  $('milestone-primary').innerHTML = t(prefix + '.action') + icons('arrow');
  $('completion-challenge').hidden = activeMilestone !== 'mastered';
  $('completion-dialog').dataset.milestone = activeMilestone;
  renderCompletionStats();
}

function scheduleMilestone(delay = 0) {
  clearTimeout(milestoneTimer);
  progress.milestonesPending = pendingMilestones(progress, levels);
  if (activeMilestone || !progress.milestonesPending.length) return;
  milestoneTimer = setTimeout(() => {
    if (busy || activeMilestone || document.querySelector('dialog[open]')) return;
    activeMilestone = progress.milestonesPending[0];
    if (!activeMilestone) return;
    renderMilestone();
    $('completion-dialog').showModal();
  }, delay);
}

function acknowledgeActiveMilestone() {
  const kind = activeMilestone;
  if (!kind) return null;
  progress = acknowledgeMilestone(progress, kind);
  activeMilestone = null;
  saveProgress();
  return kind;
}

function continueMilestone() {
  const kind = acknowledgeActiveMilestone();
  closeDialogs();
  if (kind === 'ten' || kind === 'twenty') {
    loadLevel(highestUnlockedIndex(levels, progress.records));
  } else {
    renderNavigation();
    openDialog('levels-dialog');
    const nextGold = $('level-grid').querySelector('.level-card:not(.mastered):not(:disabled)');
    if (nextGold) {
      nextGold.focus();
      nextGold.scrollIntoView({ block: 'nearest' });
    }
  }
}

function renderCompletionStats() {
  const { completed, gold } = completionTotals(levels, progress.records);
  $('completion-stats').innerHTML = '<div><strong>' + completed + '</strong><span>' + t('completion.gardens') + '</span></div><div><strong>' + gold + '</strong><span>' + t('completion.gold') + '</span></div>';
}

function updateSoundButton() {
  $('sound-button').innerHTML = icons(soundEnabled ? 'sound' : 'muted');
  $('sound-button').setAttribute('aria-label', t(soundEnabled ? 'sound.off' : 'sound.on'));
  $('sound-button').title = t(soundEnabled ? 'sound.off' : 'sound.on');
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
}

function playSound(kind, index = 0) {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = kind === 'win' ? [440, 554.37, 659.25, 880] : kind === 'undo' ? [329.63] : [[392, 440, 493.88, 523.25, 587.33, 659.25][index % 6]];
    notes.forEach((frequency, i) => {
      const time = audioContext.currentTime + i * 0.09;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(kind === 'win' ? 0.035 : 0.055, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.75);
    });
  } catch { /* Audio is optional; gameplay continues without it. */ }
}

function wireControls() {
  $('undo-button').addEventListener('click', undo);
  $('restart-button').addEventListener('click', restart);
  $('next-level').addEventListener('click', () => {
    if (!levels[current] || !goalsMet(levels[current], weights)) return;
    if (current < levels.length - 1) loadLevel(current + 1);
    else { renderNavigation(); openDialog('levels-dialog'); }
  });
  $('levels-button').addEventListener('click', () => openDialog('levels-dialog'));
  $('help-button').addEventListener('click', () => openDialog('help-dialog'));
  $('math-button').addEventListener('click', () => openDialog('math-dialog'));
  $('milestone-primary').addEventListener('click', continueMilestone);
  $('hint-button').addEventListener('click', () => { hintStep = hintStep < 0 ? 0 : -1; renderHint(); saveProgress(); });
  $('hint-more').addEventListener('click', () => { hintStep = Math.min(1, hintStep + 1); renderHint(); saveProgress(); });
  $('mobile-hint-button').addEventListener('click', () => { hintStep = Math.max(0, hintStep); renderHint(); saveProgress(); openDialog('hint-dialog'); });
  $('phone-hint-more').addEventListener('click', () => { hintStep = Math.min(1, hintStep + 1); renderHint(); saveProgress(); });
  $('sound-button').addEventListener('click', () => { soundEnabled = !soundEnabled; updateSoundButton(); saveProgress(); if (soundEnabled) playSound('move'); });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => {
    if (dialog.id === 'completion-dialog' && !dialog.open) acknowledgeActiveMilestone();
    scheduleMilestone();
  }));
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); restart(); }
  });
  new ResizeObserver(layoutBoard).observe($('garden-board'));
  installBoardTouch({
    board: $('garden-board'),
    getEdges: () => levels[current].edges,
    getPositions: () => positions,
    getNodeRadius: () => nodeRadii,
    onEdgeTap: takeMove,
    canInteract: () => isLevelUnlocked(levels, progress.records, current) && !busy && !goalsMet(levels[current], weights) && history.length < levels[current].budget
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });
}

function addFireflies() {
  for (let i = 0; i < 17; i++) {
    const dot = document.createElement('i');
    dot.className = 'firefly';
    dot.style.left = ((i * 47 + 13) % 97) + '%';
    dot.style.top = ((i * 31 + 8) % 93) + '%';
    dot.style.setProperty('--delay', -(i * 1.7) + 's');
    dot.style.setProperty('--duration', (6 + i % 5) + 's');
    $('fireflies').append(dot);
  }
}

async function boot() {
  readProgress();
  refreshLanguage();
  $('language-button').addEventListener('click', () => {
    setLanguage(getLanguage() === 'en' ? 'zh' : 'en');
    refreshLanguage();
  });
  try {
    const embeddedData = $('level-data');
    let data;
    if (embeddedData) data = JSON.parse(embeddedData.textContent);
    else {
      const response = await fetch('./levels.json?v=petal-bull-1');
      if (!response.ok) throw new Error('Unable to load level data');
      data = await response.json();
    }
    if (!Array.isArray(data) || data.length !== 30) throw new Error('Expected thirty levels');
    data.forEach(level => { const errors = validateLevel(level); if (errors.length) throw new Error('Level ' + level.id + ': ' + errors.join(', ')); });
    levels = data;
    progress = normalizeProgress(storedProgress, levels);
    soundEnabled = progress.sound;
    $('loading-message').hidden = true;
    wireControls();
    addFireflies();
    loadLevel(currentIndexForProgress(levels, progress), true);
  } catch (error) {
    loadFailed = true;
    renderLoadError();
    console.error(error);
  }
}

function renderLoadError() {
  $('loading-message').hidden = false;
  $('loading-message').innerHTML = t('load.error') + '<br><button type="button" class="tool-button" id="retry-load">' + t('load.retry') + '</button>';
  $('retry-load').addEventListener('click', () => location.reload());
  $('status-note').textContent = t('load.reload');
}

boot();
