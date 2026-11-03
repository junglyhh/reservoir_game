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
    'level.eyebrow': 'GARDEN {number} / {total} · {chapter}',
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
    'par': 'Golden bloom: {moves}',
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
    'nav.locked': ', locked',
    'nav.unlockHint': 'Clear level {number} to unlock',
    'toast.locked': 'Clear level {number} first.',
    'nav.meta': '{difficulty} · {moves}',
    'journey.progress': '{count} of {total} gardens awakened',
    'hint.first': 'Look for the junction that can supply more than one bloom.',
    'hint.second': 'Watch how each share changes both vessels. Keep enough light in reserve for the remaining blooms.',
    'hint.stronger': 'Another perspective',
    'completion.gardens': 'gardens awakened',
    'completion.gold': 'golden blooms',
    'milestone.ten.eyebrow': '10 GARDENS AWAKENED',
    'milestone.ten.title': 'You’re amazing!',
    'milestone.ten.copy': 'You’ve cleared your first 10 levels. A new challenge awaits—keep the light flowing!',
    'milestone.ten.action': 'Continue to level 11',
    'milestone.twenty.eyebrow': '20 OF 30 GARDENS',
    'milestone.twenty.title': 'Two-thirds of the way there!',
    'milestone.twenty.copy': 'You’ve cleared 20 levels. Now it’s time to put your skills to the test.',
    'milestone.twenty.action': 'Take on level 21',
    'milestone.final.eyebrow': 'ALL 30 GARDENS AWAKENED',
    'milestone.final.title': 'Your final challenge',
    'milestone.final.copy': 'Earn a golden bloom for every level. Revisit the gardens and see how few moves you can use.',
    'milestone.final.action': 'Seek the remaining golden blooms',
    'milestone.mastered.eyebrow': '30 GOLDEN BLOOMS',
    'milestone.mastered.title': 'Every garden shines gold!',
    'milestone.mastered.copy': 'Congratulations! You’ve mastered all 30 levels. Ready for the ultimate challenge: the mathematics behind the garden?',
    'milestone.mastered.action': 'Revisit the gardens',
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
    'level.eyebrow': '第 {number} 关 / 共 {total} 关 · {chapter}',
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
    'par': '金色花朵：{moves}',
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
    'nav.locked': '，尚未解锁',
    'nav.unlockHint': '通过第 {number} 关后解锁',
    'toast.locked': '请先通过第 {number} 关。',
    'nav.meta': '{difficulty} · {moves}',
    'journey.progress': '已点亮 {count} / {total} 座花园',
    'hint.first': '找找哪个中转点可以为多朵花提供光量。',
    'hint.second': '留意每次均分对两端的影响，为尚未达标的花朵保留足够的光量。',
    'hint.stronger': '换个角度思考',
    'completion.gardens': '座花园已绽放',
    'completion.gold': '朵金色花朵',
    'milestone.ten.eyebrow': '已点亮十座花园',
    'milestone.ten.title': '你太棒了！',
    'milestone.ten.copy': '你已闯过前十关。新的挑战就在前方，继续传递光芒吧！',
    'milestone.ten.action': '前往第十一关',
    'milestone.twenty.eyebrow': '三十座花园，已点亮二十座',
    'milestone.twenty.title': '你已完成三分之二！',
    'milestone.twenty.copy': '你已通过二十关。现在，是时候真正考验你的本领了。',
    'milestone.twenty.action': '挑战第二十一关',
    'milestone.final.eyebrow': '三十座花园，全部点亮',
    'milestone.final.title': '最后的挑战',
    'milestone.final.copy': '为每一关赢得一朵金色花朵。重游花园，看看能把步数精简到多少。',
    'milestone.final.action': '寻找尚未获得的金色花朵',
    'milestone.mastered.eyebrow': '三十朵金色花朵',
    'milestone.mastered.title': '满园流光，尽染金色！',
    'milestone.mastered.copy': '恭喜你！三十关全部获得金色花朵。准备好迎接终极挑战，探索花园背后的数学了吗？',
    'milestone.mastered.action': '重游花园',
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
