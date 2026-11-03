import { staticMessages } from './i18n-static.js';
import { levelTranslations } from './i18n-levels.js';

const languageStorageKey = 'a-share-of-light-language-v1';
// Keep this read-only fallback for language choices saved before the rename.
const legacyLanguageStorageKey = 'liquid-light-language-v1';
let language = 'en';
try {
  const saved = globalThis.localStorage?.getItem(languageStorageKey) ?? globalThis.localStorage?.getItem(legacyLanguageStorageKey);
  if (saved === 'zh' || saved === 'en') {
    language = saved;
    globalThis.localStorage?.setItem(languageStorageKey, saved);
  }
} catch { /* The language switch still works when storage is unavailable. */ }

export const messages = {
  en: {
    ...staticMessages.en,
    'save.saved': 'Your garden is saved',
    'save.session': 'Progress lasts for this visit',
    'move.one': '{count} move',
    'move.many': '{count} moves',
    'level.eyebrow': 'GARDEN {number} / 10 · {chapter}',
    'level.defaultChapter': 'A journey into balance',
    'difficulty.Easy': 'Easy',
    'difficulty.Medium': 'Medium',
    'difficulty.Hard': 'Hard',
    'difficulty.Master': 'Master',
    'objective.singleTitle': 'Awaken the bloom.',
    'objective.doubleTitle': 'Let both blooms glow.',
    'objective.multiTitle': 'Bring every bloom to life.',
    'objective.single': 'Within {moves}, bring the marked vessel to at least its target percentage.',
    'objective.multiple': 'Within {moves}, bring all {count} marked vessels to at least their targets at the same time.',
    'par': 'An elegant solution: {moves}',
    'target.name': 'Bloom {label}',
    'target.minimum': 'At least {goal}',
    'target.reached': 'Met · at least {goal}',
    'node.source': 'SOURCE {label}',
    'node.bloom': 'BLOOM {label}',
    'node.firstDrop': 'The first drop',
    'node.junction': 'Junction',
    'node.minimum': '≥ {goal}',
    'node.reached': '✓ ≥ {goal}',
    'node.a11y': '{label}: {amount}',
    'node.goalA11y': ', minimum {goal}, {status}',
    'goal.met': 'goal met',
    'goal.unmet': 'not yet met',
    'edge.share': 'Share light equally between {a} and {b}',
    'next.explore': 'Explore the gardens',
    'next.garden': 'Next garden',
    'caption.gold': 'Beautifully balanced. A golden bloom earned.',
    'caption.won': 'A little light, beautifully shared.',
    'caption.exhausted': 'A different order could change everything. Try undo.',
    'caption.first': 'Tap the connection to share the light equally.',
    'caption.play': 'Tap a connection. Let the light find its balance.',
    'status.won': 'Garden awakened in {moves}.',
    'status.exhausted': 'All moves used. Undo or restart to try another path.',
    'status.remaining': '{moves} left. All targets must reach or exceed their minimums together.',
    'best': 'Your best: {moves}',
    'toast.balanced': 'Already balanced. No move used.',
    'nav.label': 'Level {number}: {name}, {difficulty}{status}',
    'nav.mastered': ', golden bloom earned',
    'nav.complete': ', completed',
    'nav.meta': '{difficulty} · {moves}',
    'journey.progress': '{count} of 10 gardens awakened',
    'hint.first': 'Look for the junction that can supply more than one bloom.',
    'hint.second': 'From the starting position, begin by sharing {a} with {b}. Keep your next target in mind.',
    'hint.solution': 'One path from the starting position: {path}. Restart first if you want to follow it.',
    'hint.stronger': 'Show a stronger hint',
    'hint.complete': 'Show one complete solution',
    'completion.gardens': 'gardens awakened',
    'completion.gold': 'golden blooms',
    'sound.on': 'Turn sound on',
    'sound.off': 'Turn sound off',
    'load.error': 'The garden needs a moment.',
    'load.retry': 'Try again',
    'load.reload': 'Please reload to bring the garden back.'
  },
  zh: {
    ...staticMessages.zh,
    'save.saved': '花园进度已保存',
    'save.session': '进度仅在本次游玩中保留',
    'move.one': '{count} 步',
    'move.many': '{count} 步',
    'level.eyebrow': '第 {number} 关 / 共 10 关 · {chapter}',
    'level.defaultChapter': '寻找平衡之旅',
    'difficulty.Easy': '简单',
    'difficulty.Medium': '中等',
    'difficulty.Hard': '困难',
    'difficulty.Master': '大师',
    'objective.singleTitle': '唤醒这朵花。',
    'objective.doubleTitle': '让两朵花同时绽放。',
    'objective.multiTitle': '让每朵花都绽放。',
    'objective.single': '在 {moves}内，让标记水池的光量达到或超过目标百分比。',
    'objective.multiple': '在 {moves}内，让全部 {count} 个标记水池同时达到或超过各自的目标下限。',
    'par': '精妙解法：{moves}',
    'target.name': '花朵 {label}',
    'target.minimum': '至少 {goal}',
    'target.reached': '已达标 · 至少 {goal}',
    'node.source': '源点 {label}',
    'node.bloom': '花朵 {label}',
    'node.firstDrop': '第一束光',
    'node.junction': '中转点',
    'node.minimum': '≥ {goal}',
    'node.reached': '✓ ≥ {goal}',
    'node.a11y': '{label}：{amount}',
    'node.goalA11y': '，最低需求 {goal}，{status}',
    'goal.met': '已达标',
    'goal.unmet': '尚未达标',
    'edge.share': '将 {a} 与 {b} 的光量平均分配',
    'next.explore': '重游花园',
    'next.garden': '下一关',
    'caption.gold': '平衡之美，为你赢得一朵金色花朵。',
    'caption.won': '光芒流转，花园已然绽放。',
    'caption.exhausted': '换个顺序，也许就能成功。试试撤销。',
    'caption.first': '点击连线，将两端的光量平均分配。',
    'caption.play': '点击连线，让光芒找到平衡。',
    'status.won': '用了 {moves}，花园已绽放。',
    'status.exhausted': '步数已用完。撤销或重新开始，尝试另一条路径。',
    'status.remaining': '还剩 {moves}。所有目标都须同时达到或超过各自下限。',
    'best': '最佳记录：{moves}',
    'toast.balanced': '两端已平衡，不消耗步数。',
    'nav.label': '第 {number} 关：{name}，{difficulty}{status}',
    'nav.mastered': '，已获金色花朵',
    'nav.complete': '，已通关',
    'nav.meta': '{difficulty} · {moves}',
    'journey.progress': '已点亮 {count} / 10 座花园',
    'hint.first': '找找哪个中转点可以为多朵花提供光量。',
    'hint.second': '从初始状态出发，先连接 {a} 与 {b}，再想想下一步要照亮哪里。',
    'hint.solution': '从初始状态出发的一种完整解法：{path}。如要按此顺序操作，请先重新开始本关。',
    'hint.stronger': '查看进一步提示',
    'hint.complete': '查看一种完整解法',
    'completion.gardens': '座花园已绽放',
    'completion.gold': '朵金色花朵',
    'sound.on': '开启音效',
    'sound.off': '关闭音效',
    'load.error': '花园还需要片刻。',
    'load.retry': '重试',
    'load.reload': '请重新加载，让花园再次绽放。'
  }
};

export function getLanguage() { return language; }

export function setLanguage(next) {
  if (next !== 'en' && next !== 'zh') return language;
  language = next;
  try { globalThis.localStorage?.setItem(languageStorageKey, language); }
  catch { /* Saving is optional for local files and private browsing. */ }
  return language;
}

export function t(key, parameters = {}) {
  const message = messages[language][key] ?? messages.en[key];
  if (message === undefined) throw new Error('Missing translation: ' + key);
  return message.replace(/\{(\w+)\}/g, (match, name) => parameters[name] === undefined ? match : String(parameters[name]));
}

export function moveCount(count) {
  return t(count === 1 ? 'move.one' : 'move.many', { count });
}

export function translateLevel(level) {
  const translated = levelTranslations[language]?.[level.id];
  return translated ? { ...level, ...translated } : level;
}

export function applyStaticTranslations(root = document) {
  root.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  const bindings = [
    ['data-i18n', (element, value) => { element.textContent = value; }],
    ['data-i18n-html', (element, value) => { element.innerHTML = value; }],
    ...['aria-label', 'title', 'content'].map(attribute => ['data-i18n-' + attribute, (element, value) => element.setAttribute(attribute, value)])
  ];
  for (const [attribute, update] of bindings) {
    root.querySelectorAll('[' + attribute + ']').forEach(element => update(element, t(element.getAttribute(attribute))));
  }
}
