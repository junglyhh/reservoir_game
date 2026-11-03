import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('./local-test/level-27-bull-preview.html', import.meta.url), 'utf8');
const data = JSON.parse(html.match(/<script id="level-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const program = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(match => !match[0].includes('type="application/json"'))[0][1];
assert.equal(data.length, 1);
assert.equal(data[0].id, 31);
assert.equal(data[0].budget, data[0].par);
assert.ok(!Object.hasOwn(data[0], 'solution'));
assert.match(html, /\.journey, #levels-button, #next-level \{ display: none !important;/);

// Run the actual bundled boot and move handlers. Stub only visual rendering
// and sound; the real progress gates, save/resume, language, and win flow run.
const marker = '\nboot();';
assert.equal(program.split(marker).length - 1, 1);
const testProgram = program.replace(marker, `
globalThis.previewTest = {
  boot, takeMove, undo, restart, setLanguage, getLanguage, t, translateLevel,
  state: () => ({ levels, current, weights, history, progress, activeMilestone, loadFailed }),
  stubPresentation() {
    refreshLanguage = () => {};
    wireControls = () => {};
    addFireflies = () => {};
    buildBoard = () => {};
    render = () => {};
    renderNavigation = () => {};
    renderHint = () => {};
    renderLevelText = () => {};
    renderSaveNote = () => {};
    playSound = () => {};
  }
};`);

const productionKeys = ['a-share-of-light-progress-v1', 'liquid-light-garden-v1', 'a-share-of-light-language-v1', 'liquid-light-language-v1'];
const saved = new Map(productionKeys.map(key => [key, 'untouched-production-value']));
const storageAccess = [];
const timers = new Map();
let timerId = 0;
let dialogsShown = 0;
function element() {
  return {
    children: [], attrs: {}, descendants: {}, hidden: false,
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); },
    querySelector(selector) { return this.descendants[selector] ||= element(); },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; },
    addEventListener() {},
    showModal() { dialogsShown++; },
    close() {},
    dataset: {}, style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} }
  };
}
const elements = new Map();
elements.set('level-data', { textContent: JSON.stringify(data) });
const sandbox = {
  console, matchMedia: () => ({ matches: true }),
  document: {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element,
    querySelectorAll: () => [],
    querySelector: () => null
  },
  localStorage: {
    getItem(key) { storageAccess.push(key); return saved.get(key) ?? null; },
    setItem(key, value) { storageAccess.push(key); saved.set(key, value); }
  },
  setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
  clearTimeout(id) { timers.delete(id); },
  fetch() { throw new Error('The standalone preview must not fetch its level data.'); }
};
function flushTimers() {
  while (timers.size) {
    const queued = [...timers.values()];
    timers.clear();
    queued.forEach(callback => callback());
  }
}
const plain = value => JSON.parse(JSON.stringify(value));
runInNewContext(testProgram, sandbox, { filename: 'level-27-bull-preview.html', timeout: 2000 });
const api = sandbox.previewTest;
api.stubPresentation();
await api.boot();
assert.equal(api.state().loadFailed, false);
assert.equal(api.state().levels.length, 1);
assert.equal(api.state().current, 0);
assert.deepEqual(plain(api.state().weights), [100, 0, 0, 0, 0]);
assert.deepEqual(plain(api.state().progress.records), {}, 'Preview opens without invented campaign victories');

for (const language of ['en', 'zh']) {
  api.setLanguage(language);
  assert.equal(api.getLanguage(), language);
  const heading = api.t('level.eyebrow');
  assert.ok(heading.includes('27'));
  assert.match(heading, language === 'en' ? /LOCAL PREVIEW/ : /本地试玩/);
  assert.match(api.t('preview.notice'), language === 'en' ? /separate/ : /分开保存/);
  assert.equal(api.translateLevel(data[0]).nodes.length, 5);
  assert.match(api.t('static.helpStep3Copy'), /15/);
}

api.takeMove(1); // Initially both ends of H–J are empty.
flushTimers();
assert.equal(api.state().history.length, 0);
api.takeMove(0);
flushTimers();
assert.deepEqual(plain(api.state().weights), [50, 50, 0, 0, 0]);
assert.equal(api.state().history.length, 1);
api.undo();
assert.deepEqual(plain(api.state().weights), [100, 0, 0, 0, 0]);

const certificate = JSON.parse(readFileSync(new URL('./validation/level-solutions.json', import.meta.url), 'utf8')).levels['31'];
for (const edgeIndex of certificate.solution) { api.takeMove(edgeIndex); flushTimers(); }
assert.equal(api.state().history.length, 15);
assert.equal(api.state().progress.records['31'].moves, 15);
assert.equal(api.state().activeMilestone, null);
assert.equal(dialogsShown, 0, 'One preview win must not trigger full-campaign milestones');
assert.deepEqual(plain(api.state().progress.milestonesPending), []);
const winningWeights = plain(api.state().weights);
api.takeMove(0);
assert.deepEqual(plain(api.state().weights), winningWeights, 'Moves after victory remain guarded');
api.restart();
assert.equal(api.state().history.length, 0);
assert.deepEqual(plain(api.state().weights), [100, 0, 0, 0, 0]);
assert.ok(storageAccess.every(key => key.includes('bull-preview')));
for (const key of productionKeys) assert.equal(saved.get(key), 'untouched-production-value');
console.log('PASS isolated preview: real bundled boot, independent storage, both languages, no-op edges, undo, 15-move win, no campaign popup, guarded victory, and restart.');
