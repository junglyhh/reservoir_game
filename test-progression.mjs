import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { averageEdge, initialWeights } from './docs/engine.js';
import { messages, t, getLanguage, setLanguage, applyStaticTranslations } from './docs/i18n.js';
import { isRecord, completionTotals, highestUnlockedIndex, isLevelUnlocked, currentIndexForProgress, pendingMilestones, acknowledgeMilestone, recordCompletion, normalizeProgress, isValidResume } from './docs/progression.js';

const ids = [1, 2, 3, 11, 4, 12, 5, 13, 6, 14, 15, 16, 17, 18, 19, 20, 7, 21, 22, 8, 23, 24, 25, 9, 26, 27, 28, 29, 30, 10];
const levels = ids.map(id => ({ id, name: 'Garden ' + id, difficulty: 'Medium', par: 3, budget: 8, nodes: [], edges: [] }));
let groups = 0;

let progress = normalizeProgress(null, levels);
assert.equal(highestUnlockedIndex(levels, progress.records), 0);
assert.equal(isLevelUnlocked(levels, progress.records, 0), true);
for (const index of [-1, 1, 29, 30, 1.5, NaN]) assert.equal(isLevelUnlocked(levels, progress.records, index), false);
const rejected = recordCompletion(progress, levels, 1, 3);
assert.strictEqual(rejected, progress, 'A locked-level callback must not record a victory');
progress = recordCompletion(progress, levels, 0, 6);
assert.equal(highestUnlockedIndex(levels, progress.records), 1, 'A non-golden pass unlocks the next level');
assert.deepEqual(completionTotals(levels, progress.records), { completed: 1, gold: 0, total: 30 });
progress = recordCompletion(progress, levels, 0, 3);
assert.deepEqual(completionTotals(levels, progress.records), { completed: 1, gold: 1, total: 30 }, 'A better replay earns gold without increasing completed count');
progress = recordCompletion(progress, levels, 0, 7);
assert.equal(progress.records[1].moves, 3, 'A slower replay keeps the best result');
assert.strictEqual(recordCompletion(progress, levels, 1, 9), progress, 'Over-budget results cannot unlock a level');
assert.strictEqual(recordCompletion(progress, levels, 1, 0), progress, 'Zero-move records cannot unlock a level');
groups++;

const oldSave = {
  records: { 1: { moves: 1 }, 2: { moves: 2 }, 3: { moves: 4 }, 7: { moves: 7 }, 9: { moves: 8 }, 999: { moves: 1 } },
  current: 8,
  sound: true,
  celebrated: true,
  active: { level: 8, weights: [50, 50], history: [[100, 0]], hintStep: 2 }
};
const migrated = normalizeProgress(oldSave, levels);
assert.equal(migrated.campaignVersion, 2);
assert.equal(migrated.currentId, 11, 'A newly inserted uncleared level blocks a formerly selected later level');
assert.equal(currentIndexForProgress(levels, migrated), 3);
assert.equal(migrated.active, null, 'A locked saved board must not resume under another graph');
assert.equal(migrated.records[7].moves, 7, 'Original stable-ID victories survive reordering');
assert.equal(migrated.records[9].moves, 8);
assert.equal(migrated.records[999], undefined, 'Unknown records are discarded');
assert.equal(migrated.sound, true);
assert.deepEqual(migrated.milestonesSeen, {}, 'The old ten-level celebration must not suppress the new campaign milestones');
assert.equal(isLevelUnlocked(levels, migrated.records, 16), false, 'A later imported victory cannot skip uncleared predecessors');
assert.equal(isLevelUnlocked(levels, migrated.records, 3), true);
const reopened = normalizeProgress(JSON.parse(JSON.stringify(migrated)), levels);
assert.deepEqual(reopened, migrated, 'Repeated reloads must not remap stable IDs as array positions');
const legacyActive = normalizeProgress({ records: { 1: { moves: 1 } }, current: 1, active: { level: 1, weights: [100, 0, 0], history: [], hintStep: 2 } }, levels);
assert.equal(legacyActive.currentId, 2);
assert.equal(legacyActive.active.levelId, 2);
assert.equal(legacyActive.active.hintStep, 1, 'An old full-solution hint state is clamped to conceptual hints');
const oldComplete = normalizeProgress({ records: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, { moves: 3 }])), celebrated: true }, levels);
assert.equal(completionTotals(levels, oldComplete.records).completed, 10);
assert.deepEqual(oldComplete.milestonesPending, [], 'Ten old out-of-order wins do not announce stage 11 before the new first ten are cleared');
groups++;

// Replacing a puzzle must not award its new version an old completion. Keep
// every unrelated record, then restore later access once the replacement wins.
const currentCampaign = JSON.parse(readFileSync(new URL('./docs/levels.json', import.meta.url), 'utf8'));
assert.equal(currentCampaign[26].id, 31);
const previousRecords = Object.fromEntries(currentCampaign.filter(level => level.id !== 31).map(level => [level.id, { moves: level.par }]));
previousRecords[28] = { moves: 15 };
const replacementProgress = normalizeProgress({
  campaignVersion: 2, currentId: 28, records: previousRecords,
  active: { levelId: 28, weights: [100, 0, 0, 0], history: [], hintStep: -1 }
}, currentCampaign);
assert.equal(replacementProgress.records[28], undefined);
assert.equal(replacementProgress.records[31], undefined);
assert.equal(replacementProgress.active, null, 'Do not resume the retired graph as the new one');
assert.equal(replacementProgress.currentId, 31);
assert.equal(highestUnlockedIndex(currentCampaign, replacementProgress.records), 26);
for (const level of currentCampaign.filter(level => level.id !== 31)) {
  assert.deepEqual(replacementProgress.records[level.id], previousRecords[level.id], 'Preserve all unrelated records');
}
const replacementCleared = recordCompletion(replacementProgress, currentCampaign, 26, 15);
assert.equal(highestUnlockedIndex(currentCampaign, replacementCleared.records), 29);
assert.deepEqual(completionTotals(currentCampaign, replacementCleared.records), { completed: 30, gold: 30, total: 30 });
groups++;

progress = normalizeProgress(null, levels);
for (let i = 0; i < 10; i++) progress = recordCompletion(progress, levels, i, 6);
assert.deepEqual(progress.milestonesPending, ['ten']);
assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress)), levels).milestonesPending, ['ten'], 'A pending celebration survives a reload');
progress = acknowledgeMilestone(progress, 'ten');
assert.deepEqual(pendingMilestones(progress, levels), []);
progress = recordCompletion(progress, levels, 9, 3);
assert.deepEqual(progress.milestonesPending, [], 'Replaying a milestone level does not repeat its celebration');
for (let i = 10; i < 20; i++) progress = recordCompletion(progress, levels, i, 6);
assert.deepEqual(progress.milestonesPending, ['twenty']);
progress = acknowledgeMilestone(progress, 'twenty');
for (let i = 20; i < 30; i++) progress = recordCompletion(progress, levels, i, 6);
assert.deepEqual(progress.milestonesPending, ['final']);
assert.equal(highestUnlockedIndex(levels, progress.records), 29);
assert.equal(completionTotals(levels, progress.records).completed, 30);
progress = acknowledgeMilestone(progress, 'final');
for (let i = 0; i < 30; i++) progress = recordCompletion(progress, levels, i, 3);
assert.deepEqual(progress.milestonesPending, ['mastered']);
assert.equal(completionTotals(levels, progress.records).gold, 30);
progress = acknowledgeMilestone(progress, 'mastered');
assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress)), levels).milestonesPending, [], 'All acknowledged milestones stay acknowledged');
groups++;

let perfect = normalizeProgress(null, levels);
for (let i = 0; i < 30; i++) perfect = recordCompletion(perfect, levels, i, 3);
assert.deepEqual(perfect.milestonesPending, ['ten', 'twenty', 'mastered'], 'A perfect first campaign skips the collect-more-gold message');
let waiting = normalizeProgress(null, levels);
for (let i = 0; i < 30; i++) waiting = recordCompletion(waiting, levels, i, 6);
for (let i = 0; i < 30; i++) waiting = recordCompletion(waiting, levels, i, 3);
assert.deepEqual(waiting.milestonesPending, ['ten', 'twenty', 'final', 'mastered'], 'An earned but unread final challenge is not lost when gold is completed');
waiting = normalizeProgress(JSON.parse(JSON.stringify(waiting)), levels);
for (const kind of ['ten', 'twenty', 'final', 'mastered']) {
  assert.equal(waiting.milestonesPending[0], kind);
  waiting = acknowledgeMilestone(waiting, kind);
}
assert.deepEqual(waiting.milestonesPending, []);
assert.deepEqual(pendingMilestones(normalizeProgress(null, []), []), [], 'An empty loading state is not a mastered campaign');
groups++;

const relay = { id: 3, root: 0, par: 4, budget: 6, nodes: [{}, {}, { goal: 30 }], edges: [[0, 1], [1, 2]] };
let state = initialWeights(relay);
const history = [];
for (const edgeIndex of [0, 1]) {
  history.push(state);
  state = averageEdge(state, relay.edges[edgeIndex]);
}
const active = { levelId: 3, weights: state, history, hintStep: 1 };
assert.equal(isValidResume(active, relay), true);
assert.equal(isValidResume({ ...active, levelId: 2 }, relay), false);
assert.equal(isValidResume({ ...active, weights: [0, 50, 50] }, relay), false, 'A non-replayable snapshot is discarded');
assert.equal(isValidResume({ ...active, weights: [50, NaN, 50] }, relay), false);
assert.equal(isValidResume({ levelId: 3, weights: initialWeights(relay), history: [initialWeights(relay)] }, relay), false, 'No-op history cannot spend moves');
for (const edgeIndex of [0, 1, 0]) {
  history.push(state);
  state = averageEdge(state, relay.edges[edgeIndex]);
}
assert.equal(isValidResume({ levelId: 3, weights: state, history }, relay), false, 'A saved game cannot include moves after victory');
groups++;

// Exercise the actual UI route as well as the pure gate. Even if a disabled
// button callback is invoked directly, loadLevel must reject its locked index.
const app = readFileSync(new URL('./docs/app.js', import.meta.url), 'utf8');
const loadSource = app.match(/function loadLevel\(index, resume = false\) \{[\s\S]*?\n\}/)?.[0];
const navigationSource = app.match(/function renderNavigation\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(loadSource && navigationSource);
const elements = Object.fromEntries(['level-track', 'level-grid', 'journey-progress'].map(id => [id, {
  children: [], replaceChildren() { this.children = []; }, append(child) { this.children.push(child); }
}]));
const alerts = [];
const context = {
  levels, progress: normalizeProgress(null, levels), current: 0,
  isRecord, isLevelUnlocked, translateLevel: level => level,
  completedCount: () => 0,
  $: id => elements[id],
  t: (key, params = {}) => key + JSON.stringify(params),
  moveCount: count => count + ' moves',
  icons: name => name,
  miniGraph: () => '',
  toast: (key, params) => alerts.push({ key, params }),
  closeDialogs() {},
  document: { createElement() {
    return {
      attrs: {}, listeners: {}, children: {},
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key]; },
      addEventListener(key, callback) { this.listeners[key] = callback; },
      querySelector(key) { return this.children[key] ||= {}; }
    };
  } }
};
runInNewContext(loadSource + '\n' + navigationSource + '\nrenderNavigation();', context);
for (const group of ['level-track', 'level-grid']) {
  assert.equal(elements[group].children.length, 30);
  assert.equal(elements[group].children[0].disabled, false);
  for (const button of elements[group].children.slice(1)) assert.equal(button.disabled, true);
  elements[group].children[4].listeners.click();
}
assert.equal(context.current, 0);
assert.equal(alerts.length, 2);
assert.ok(alerts.every(alert => alert.key === 'toast.locked'));
assert.doesNotMatch(app, /level\.solution|hint\.solution|hint\.complete/);
assert.match(app, /if \(!levels\[current\] \|\| !goalsMet\(levels\[current\], weights\)\) return;/, 'The hidden next-level action must also guard incomplete play');
groups++;

// Run the actual milestone rendering, scheduling, acknowledgement and controls
// against a small DOM and separately queued timers/native close events. This
// exercises the asynchronous UI without needing a browser or exposing solutions.
const milestoneFunctions = ['saveProgress', 'closeDialogs', 'openDialog', 'renderMilestone', 'scheduleMilestone', 'acknowledgeActiveMilestone', 'continueMilestone', 'renderCompletionStats', 'wireControls'];
const milestoneSource = milestoneFunctions.map(name => {
  const source = app.match(new RegExp('function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}'))?.[0];
  assert.ok(source, 'Missing runtime function: ' + name);
  return source;
}).join('\n');
const page = readFileSync(new URL('./docs/index.html', import.meta.url), 'utf8');
const challengeMarkup = page.match(/<section id="completion-challenge"[\s\S]*?<\/section>/)?.[0];
assert.ok(challengeMarkup, 'The final celebration contains the tea-sharing challenge');
const challengeBindings = [...challengeMarkup.matchAll(/\b(data-i18n(?:-html)?)="([^"]+)"/g)].map(match => ({ attribute: match[1], key: match[2] }));
assert.equal(challengeBindings.length, 5, 'The ultimate challenge includes its heading, setup, bound, question and source');

function campaignWithClears(count, golden = false) {
  let result = normalizeProgress(null, levels);
  for (let index = 0; index < count; index++) result = recordCompletion(result, levels, index, golden ? 3 : 6);
  return result;
}

function milestoneHarness(initialProgress) {
  let now = 0;
  let timerId = 0;
  let writes = 0;
  const timers = new Map();
  const closeEvents = [];
  const saved = new Map();
  const loaded = [];
  const nodes = new Map();
  const dialogIds = ['completion-dialog', 'hint-dialog', 'levels-dialog', 'help-dialog', 'math-dialog'];
  const nextGold = { focused: 0, scrolled: 0, focus() { this.focused++; }, scrollIntoView() { this.scrolled++; } };
  function element(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, open: false, hidden: false, dataset: {}, attrs: {}, style: { getPropertyValue() { return '48px'; } }, listeners: {}, showCount: 0,
      getAttribute(name) { return this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); },
      emit(name, event = {}) { for (const listener of this.listeners[name] || []) listener(event); },
      click() { this.emit('click', { target: this }); },
      showModal() { assert.equal(this.open, false); this.open = true; this.showCount++; },
      close() { if (!this.open) return; this.open = false; closeEvents.push(() => this.emit('close')); },
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 100 }; },
      querySelector(selector) {
        if (id === 'level-grid' && selector === '.level-card:not(.mastered):not(:disabled)') return completionTotals(levels, ui.progress.records).gold < levels.length ? nextGold : null;
        return element(id + ':' + selector);
      }
    });
    return nodes.get(id);
  }
  const dialogs = dialogIds.map(element);
  const challengeNodes = challengeBindings.map(({ attribute, key }) => {
    const node = element('challenge:' + key);
    node.setAttribute(attribute, key);
    return node;
  });
  const closeButtons = dialogIds.map(id => {
    const button = element(id + '-close');
    button.closest = selector => { assert.equal(selector, 'dialog'); return element(id); };
    return button;
  });
  const ui = {
    levels, progress: JSON.parse(JSON.stringify(initialProgress)), current: 0,
    weights: [], history: [], hintStep: -1, soundEnabled: false, storageAvailable: true,
    storageKey: 'progress-test', activeMilestone: null, milestoneTimer: undefined, busy: false, positions: [],
    completionTotals, highestUnlockedIndex, isLevelUnlocked, pendingMilestones, acknowledgeMilestone,
    t, icons: name => '<svg data-icon="' + name + '"></svg>',
    $: element,
    setTimeout(callback, delay = 0) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    localStorage: { setItem(key, value) { writes++; saved.set(key, value); } },
    renderSaveNote() {}, undo() {}, restart() {}, renderHint() {}, updateSoundButton() {}, playSound() {}, layoutBoard() {}, takeMove() {},
    goalsMet() { return true; },
    loadLevel(index) { loaded.push(index); ui.current = index; ui.saveProgress(); ui.scheduleMilestone(); },
    renderNavigation() {},
    ResizeObserver: class { observe() {} },
    installBoardTouch() {},
    document: {
      hidden: false,
      documentElement: { lang: 'en' },
      querySelector(selector) { assert.equal(selector, 'dialog[open]'); return dialogs.find(dialog => dialog.open) || null; },
      querySelectorAll(selector) {
        if (selector === '[data-close]') return closeButtons;
        if (selector === 'dialog') return dialogs;
        if (selector === 'dialog[open]') return dialogs.filter(dialog => dialog.open);
        if (/^\[data-i18n(?:-[\w-]+)?\]$/.test(selector)) return challengeNodes.filter(node => node.getAttribute(selector.slice(1, -1)));
        throw new Error('Unexpected selector: ' + selector);
      },
      addEventListener() {}
    }
  };
  runInNewContext(milestoneSource + '\nwireControls();\nsaveProgress();', ui);
  function runTimers() {
    for (let count = 0; timers.size; count++) {
      assert.ok(count < 20, 'Unexpected repeating milestone timers');
      const [id, task] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      timers.delete(id);
      now = task.at;
      task.callback();
    }
  }
  function runCloseEvents() {
    while (closeEvents.length) closeEvents.shift()();
  }
  return { ui, element, loaded, nextGold, runTimers, runCloseEvents, saved: () => JSON.parse(saved.get('progress-test')), writes: () => writes };
}

const startingLanguage = getLanguage();
try {
  for (const kind of ['ten', 'twenty', 'final', 'mastered']) {
    let campaign = campaignWithClears(kind === 'ten' ? 10 : kind === 'twenty' ? 20 : 30, kind === 'mastered');
    for (const earlier of campaign.milestonesPending.slice(0, campaign.milestonesPending.indexOf(kind))) campaign = acknowledgeMilestone(campaign, earlier);
    const harness = milestoneHarness(campaign);
    harness.ui.scheduleMilestone(850);
    harness.runTimers();
    assert.equal(harness.ui.activeMilestone, kind);
    assert.equal(harness.element('completion-dialog').open, true);
    for (const language of ['en', 'zh']) {
      setLanguage(language);
      applyStaticTranslations(harness.ui.document);
      harness.ui.renderMilestone();
      assert.equal(harness.element('completion-title').textContent, messages[language]['milestone.' + kind + '.title']);
      assert.equal(harness.element('completion-eyebrow').textContent, messages[language]['milestone.' + kind + '.eyebrow']);
      assert.equal(harness.element('completion-copy').textContent, messages[language]['milestone.' + kind + '.copy']);
      assert.equal(harness.element('milestone-primary').innerHTML, messages[language]['milestone.' + kind + '.action'] + '<svg data-icon="arrow"></svg>');
      assert.equal(harness.element('completion-challenge').hidden, kind !== 'mastered');
      assert.equal(harness.element('completion-dialog').dataset.milestone, kind);
      for (const { attribute, key } of challengeBindings) {
        const node = harness.element('challenge:' + key);
        assert.equal(attribute === 'data-i18n-html' ? node.innerHTML : node.textContent, messages[language][key], 'Tea challenge language refreshes with the surrounding celebration');
      }
      const totals = completionTotals(levels, campaign.records);
      assert.equal(harness.element('completion-stats').innerHTML, '<div><strong>' + totals.completed + '</strong><span>' + messages[language]['completion.gardens'] + '</span></div><div><strong>' + totals.gold + '</strong><span>' + messages[language]['completion.gold'] + '</span></div>');
    }
    assert.ok(harness.saved().milestonesPending.includes(kind), 'Showing a milestone does not acknowledge it before the user dismisses it');
    harness.element('milestone-primary').click();
    harness.runCloseEvents();
    harness.runTimers();
    assert.equal(harness.ui.progress.milestonesSeen[kind], true);
    assert.equal(harness.saved().milestonesSeen[kind], true);
    if (kind === 'ten' || kind === 'twenty') {
      assert.deepEqual(harness.loaded, [kind === 'ten' ? 10 : 20], 'Continue targets the newly unlocked campaign stage');
    } else {
      assert.equal(harness.element('levels-dialog').open, true);
      assert.equal(harness.nextGold.focused, kind === 'final' ? 1 : 0, 'The final challenge focuses a remaining nongolden level');
    }
  }
} finally {
  setLanguage(startingLanguage);
}
groups++;

const delayed = milestoneHarness(campaignWithClears(10));
delayed.ui.openDialog('hint-dialog');
delayed.ui.scheduleMilestone(200);
delayed.runTimers();
assert.equal(delayed.ui.activeMilestone, null, 'A milestone never replaces an open hint');
assert.deepEqual(delayed.saved().milestonesPending, ['ten']);
delayed.element('hint-dialog-close').click();
delayed.runCloseEvents();
delayed.runTimers();
assert.equal(delayed.ui.activeMilestone, 'ten', 'Closing the hint presents the pending celebration');
delayed.element('completion-dialog-close').click();
delayed.runCloseEvents();
delayed.runTimers();
assert.equal(delayed.saved().milestonesSeen.ten, true);
const acknowledgedWrites = delayed.writes();
delayed.element('completion-dialog').emit('close');
delayed.runTimers();
assert.equal(delayed.writes(), acknowledgedWrites, 'A late duplicate close event does not acknowledge twice');
assert.equal(delayed.element('completion-dialog').showCount, 1);

const queuedDismissal = milestoneHarness(campaignWithClears(20));
queuedDismissal.ui.scheduleMilestone();
queuedDismissal.runTimers();
queuedDismissal.element('completion-dialog-close').click();
queuedDismissal.runCloseEvents();
queuedDismissal.runTimers();
assert.equal(queuedDismissal.saved().milestonesSeen.ten, true);
assert.equal(queuedDismissal.ui.activeMilestone, 'twenty', 'Dismissing one announcement leaves the next queued milestone available');
assert.deepEqual(queuedDismissal.saved().milestonesPending, ['twenty']);

const busyTransfer = milestoneHarness(campaignWithClears(10));
busyTransfer.ui.busy = true;
busyTransfer.ui.scheduleMilestone();
busyTransfer.runTimers();
assert.equal(busyTransfer.ui.activeMilestone, null);
assert.deepEqual(busyTransfer.saved().milestonesPending, ['ten']);
busyTransfer.ui.busy = false;
busyTransfer.ui.scheduleMilestone(200);
busyTransfer.ui.scheduleMilestone(20);
busyTransfer.runTimers();
assert.equal(busyTransfer.ui.activeMilestone, 'ten', 'The next idle schedule presents an announcement deferred by a transfer');
assert.equal(busyTransfer.element('completion-dialog').showCount, 1, 'Replacing a scheduled timer cannot show duplicate dialogs');
groups++;

const race = milestoneHarness(campaignWithClears(20));
race.ui.scheduleMilestone();
race.runTimers();
assert.equal(race.ui.activeMilestone, 'ten');
race.element('milestone-primary').click();
// Simulate the next timer running before the previous dialog's asynchronous
// close event. The old close event must never consume the newly shown milestone.
race.runTimers();
assert.equal(race.ui.activeMilestone, 'twenty');
race.runCloseEvents();
assert.equal(race.ui.activeMilestone, 'twenty');
assert.equal(race.element('completion-dialog').open, true);
assert.equal(race.ui.progress.milestonesSeen.twenty, undefined);
assert.deepEqual(race.ui.progress.milestonesPending, ['twenty']);
race.element('completion-dialog-close').click();
race.runCloseEvents();
race.runTimers();
assert.equal(race.ui.progress.milestonesSeen.twenty, true);
assert.deepEqual(race.ui.progress.milestonesPending, []);
groups++;

console.log(`PASS ${groups} progression groups: sequential locks, ordinary clears, stable-ID migration, resume validation, all four milestones, bilingual dialog rendering, deferred announcements, timer/close races, and guarded UI callbacks.`);
