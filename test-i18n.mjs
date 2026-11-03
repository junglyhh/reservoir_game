import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages, t, moveCount, translateLevel, setLanguage, getLanguage, applyStaticTranslations } from './docs/i18n.js';
import { levelTranslations } from './docs/i18n-levels.js';
import { goalsMet } from './docs/engine.js';

const [html, app, levelText] = await Promise.all([
  readFile(new URL('./docs/index.html', import.meta.url), 'utf8'),
  readFile(new URL('./docs/app.js', import.meta.url), 'utf8'),
  readFile(new URL('./docs/levels.json', import.meta.url), 'utf8')
]);
const levels = JSON.parse(levelText);
const originalLanguage = getLanguage();
const placeholders = value => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort();
const removeMarkup = value => value.replace(/<[^>]*>/g, '').replace(/\{\w+\}/g, '');
let groups = 0;

assert.deepEqual(Object.keys(messages.zh).sort(), Object.keys(messages.en).sort(), 'Chinese and English message keys must match');
for (const key of Object.keys(messages.en)) {
  assert.equal(typeof messages.en[key], 'string', `Invalid English message: ${key}`);
  assert.equal(typeof messages.zh[key], 'string', `Invalid Chinese message: ${key}`);
  assert.ok(messages.en[key].trim() && messages.zh[key].trim(), `Empty translation: ${key}`);
  assert.deepEqual(placeholders(messages.zh[key]), placeholders(messages.en[key]), `Parameter mismatch: ${key}`);
  // Mathematical labels and keyboard key names are deliberately shared.
  const prose = removeMarkup(messages.zh[key]).replace(/\b(?:Tab|Enter)\b/g, '');
  assert.doesNotMatch(prose, /[A-Za-z]{2,}/, `English prose remains in Chinese message: ${key}`);
}
groups++;

// Parse this buildless page's tags and text to find untranslated static copy,
// rather than maintaining a separate list of expected interface labels.
const elements = [];
const stack = [];
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
for (const token of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g)) {
  const raw = token[0];
  if (raw.startsWith('<!--') || raw.startsWith('<!')) continue;
  if (raw.startsWith('</')) {
    const tag = raw.match(/^<\/([\w-]+)/)?.[1].toLowerCase();
    const index = stack.findLastIndex(element => element.tag === tag);
    if (index >= 0) stack.length = index;
  } else if (raw.startsWith('<')) {
    const tag = raw.match(/^<([\w-]+)/)?.[1].toLowerCase();
    if (!tag) continue;
    const attrs = Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(match => [match[1], match[2]]));
    const element = {
      tag, attrs, textContent: '', innerHTML: '',
      getAttribute(name) { return this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = value; }
    };
    elements.push(element);
    for (const attribute of ['aria-label', 'title']) {
      if (/[A-Za-z]{2,}/.test(attrs[attribute] || '')) {
        assert.ok(attrs['data-i18n-' + attribute], `Unbound ${attribute} on ${attrs.id || tag}`);
      }
    }
    if (!voidTags.has(tag) && !raw.endsWith('/>')) stack.push(element);
  } else if (/[A-Za-z]{2,}/.test(raw)) {
    const translated = stack.some(element => element.attrs['data-i18n'] || element.attrs['data-i18n-html']);
    const exempt = stack.some(element => element.tag === 'script' || element.tag === 'style' || element.attrs.class === 'language-en');
    assert.ok(translated || exempt, `Unbound static English text: ${raw.trim()}`);
  }
}
const bindingAttributes = ['data-i18n', 'data-i18n-html', 'data-i18n-aria-label', 'data-i18n-title', 'data-i18n-content'];
let bindingCount = 0;
for (const element of elements) {
  for (const attribute of bindingAttributes) {
    const key = element.attrs[attribute];
    if (!key) continue;
    bindingCount++;
    assert.ok(Object.hasOwn(messages.en, key) && Object.hasOwn(messages.zh, key), `Missing HTML translation: ${key}`);
  }
}
for (const match of app.matchAll(/\bt\(\s*'([^']+)'\s*[,)]/g)) {
  assert.ok(Object.hasOwn(messages.en, match[1]) && Object.hasOwn(messages.zh, match[1]), `Missing app translation: ${match[1]}`);
}
groups++;

const documentStub = {
  documentElement: { lang: 'en' },
  querySelectorAll(selector) {
    const attribute = selector.slice(1, -1);
    return elements.filter(element => Object.hasOwn(element.attrs, attribute));
  }
};
for (const language of ['zh', 'en']) {
  setLanguage(language);
  applyStaticTranslations(documentStub);
  assert.equal(documentStub.documentElement.lang, language === 'zh' ? 'zh-CN' : 'en');
  for (const element of elements) {
    for (const attribute of bindingAttributes) {
      const key = element.attrs[attribute];
      if (!key) continue;
      const value = attribute === 'data-i18n' ? element.textContent : attribute === 'data-i18n-html' ? element.innerHTML : element.attrs[attribute.slice('data-i18n-'.length)];
      assert.equal(value, messages[language][key], `Binding not refreshed: ${language}:${key}`);
    }
  }
  for (const key of Object.keys(messages[language])) {
    const parameters = Object.fromEntries(placeholders(messages[language][key]).map(name => [name, name === 'count' ? 2 : 'A']));
    assert.doesNotMatch(t(key, parameters), /\{\w+\}/, `Unresolved placeholder: ${language}:${key}`);
  }
}
groups++;

setLanguage('en');
assert.equal(moveCount(0), '0 moves');
assert.equal(moveCount(1), '1 move');
assert.equal(moveCount(2), '2 moves');
setLanguage('zh');
for (const count of [0, 1, 2, 18]) assert.equal(moveCount(count), `${count} 步`);
assert.equal(setLanguage('unsupported'), 'zh', 'Invalid languages must not corrupt the current selection');
groups++;

assert.equal(levels.length, 30);
const narrativeFields = ['name', 'chapter', 'subtitle', 'hint', 'hints', 'discovery'];
const before = JSON.stringify(levels);
for (const language of ['en', 'zh', 'en', 'zh']) {
  setLanguage(language);
  for (const level of levels) {
    const localized = translateLevel(level);
    const originalGraph = Object.fromEntries(Object.entries(level).filter(([key]) => !narrativeFields.includes(key)));
    const localizedGraph = Object.fromEntries(Object.entries(localized).filter(([key]) => !narrativeFields.includes(key)));
    assert.deepEqual(localizedGraph, originalGraph, `Localization changed level ${level.id}'s rules or graph`);
    assert.ok(messages[language]['difficulty.' + level.difficulty], `Untranslated difficulty: ${level.difficulty}`);
    for (const field of narrativeFields) {
      if (language === 'en') assert.deepEqual(localized[field], level[field]);
      else {
        assert.deepEqual(localized[field], levelTranslations.zh[level.id][field]);
        const copy = Array.isArray(localized[field]) ? localized[field] : [localized[field]];
        assert.ok(copy.length > 0 && copy.every(value => typeof value === 'string' && /[\u3400-\u9fff]/.test(value)), `Incomplete Chinese narrative: ${level.id}:${field}`);
        assert.ok(copy.every(value => !/[A-Za-z]{2,}/.test(value)), `English prose in level ${level.id}:${field}`);
      }
    }
    assert.ok(localized.hints.length >= 1 && localized.hints.length <= 2, 'Hints stay conceptual and limited');
  }
}
assert.equal(JSON.stringify(levels), before, 'Repeated language switching must leave original level data intact');
groups++;

const targetFixture = { nodes: [{}, { goal: 25 }, { goal: 15 }] };
assert.equal(goalsMet(targetFixture, [60, 25, 15]), true, 'Exact equality must count');
assert.equal(goalsMet(targetFixture, [57, 27, 16]), true, 'Exceeding all minimums must count');
assert.equal(goalsMet(targetFixture, [60, 25.1, 14.9]), false, 'One surplus must not compensate for another unmet minimum');
assert.equal(goalsMet(targetFixture, [60, 24.9, 15.1]), false, 'Every marked vertex must meet its own minimum at once');
groups++;

const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  const saved = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem(key, value) { saved.set(key, value); } } });
  setLanguage('en');
  setLanguage('zh');
  assert.ok([...saved.values()].includes('zh'), 'Selected language should be saved');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage unavailable for local file'); } });
  assert.doesNotThrow(() => setLanguage('en'), 'Local-file storage restrictions must not break the switch');
  assert.equal(getLanguage(), 'en');
} finally {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
  setLanguage(originalLanguage);
}
groups++;

// Campaign save migration is covered by test-progression.mjs. Language
// preferences still need their independent legacy-key compatibility check.
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  const saved = new Map([['liquid-light-language-v1', 'zh']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value)
  } });
  const migrated = await import('./docs/i18n.js?verify-legacy-language');
  assert.equal(migrated.getLanguage(), 'zh', 'Existing language choice must survive the rename');
  assert.equal(saved.get('a-share-of-light-language-v1'), 'zh', 'Existing language should be copied to the new key');
} finally {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
}
groups++;

for (const kind of ['ten', 'twenty', 'final', 'mastered']) {
  for (const part of ['eyebrow', 'title', 'copy', 'action']) {
    for (const language of ['en', 'zh']) assert.ok(messages[language]['milestone.' + kind + '.' + part]);
  }
}
assert.ok(!Object.hasOwn(messages.en, 'hint.solution') && !Object.hasOwn(messages.zh, 'hint.solution'));
assert.ok(!Object.hasOwn(messages.en, 'hint.complete') && !Object.hasOwn(messages.zh, 'hint.complete'));
assert.doesNotMatch(app, /level\.solution|hint\.solution|hint\.complete/);
groups++;

console.log(`Passed ${groups} localization groups: ${Object.keys(messages.en).length} paired messages, ${bindingCount} HTML bindings, ${levels.length} localized levels, milestones, language preferences, and minimum-goal behavior.`);
