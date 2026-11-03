import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Script } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticMessages } from '../docs/i18n-static.js';

// Derive an isolated, one-puzzle playtest from the same self-contained build
// used by the campaign. Production data, progress gates, and storage stay intact.
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectDirectory, 'local-test');
const outputPath = path.join(outputDirectory, 'level-27-bull-preview.html');
const previewId = 31;
const previewNumber = 27;
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--download')) {
  throw new Error('Usage: node tools/build-level-preview.mjs [--download /absolute/output.html]');
}
const downloadPath = args.length ? path.resolve(args[1]) : null;

const build = JSON.parse(execFileSync(process.execPath, [path.join(projectDirectory, 'build-local.mjs')], {
  cwd: projectDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
}));
let html = await readFile(build.output, 'utf8');

function replaceOnce(before, after, description) {
  const count = html.split(before).length - 1;
  if (count !== 1) throw new Error('Preview build expected one ' + description + '; found ' + count);
  html = html.replace(before, () => after);
}

const dataMatch = html.match(/<script id="level-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!dataMatch) throw new Error('Missing embedded level data.');
const campaign = JSON.parse(dataMatch[1]);
const level = campaign[previewNumber - 1];
if (campaign.length !== 30 || level?.id !== previewId) {
  throw new Error('Expected the new bull-graph puzzle, stable ID 31, at campaign level 27.');
}
if (level.difficulty !== 'Master' || level.parVerified !== true || level.budget !== level.par || Object.hasOwn(level, 'solution')) {
  throw new Error('Preview requires a certified Master puzzle without a runtime walkthrough.');
}
replaceOnce(dataMatch[0], '<script id="level-data" type="application/json">' + JSON.stringify([level]).replace(/</g, '\\u003c') + '</script>', 'level-data payload');
replaceOnce("if (!Array.isArray(data) || data.length !== 30) throw new Error('Expected thirty levels');", "if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one preview level');", 'boot level-count guard');

const keyMap = new Map([
  ['a-share-of-light-progress-v1', 'a-share-of-light-bull-preview-progress-v1'],
  ['liquid-light-garden-v1', 'a-share-of-light-bull-preview-legacy-progress-v1'],
  ['a-share-of-light-language-v1', 'a-share-of-light-bull-preview-language-v1'],
  ['liquid-light-language-v1', 'a-share-of-light-bull-preview-legacy-language-v1']
]);
for (const [before, after] of keyMap) replaceOnce("'" + before + "'", "'" + after + "'", 'storage key ' + before);

replaceOnce("'level.eyebrow': 'GARDEN {number} / {total} · {chapter}'", "'level.eyebrow': 'LEVEL 27 · LOCAL PREVIEW'", 'English preview heading');
replaceOnce("'level.eyebrow': '第 {number} 关 / 共 {total} 关 · {chapter}'", "'level.eyebrow': '第 27 关 · 本地试玩'", 'Chinese preview heading');
replaceOnce("'save.saved': 'Your garden is saved'", "'save.saved': 'Test progress saved'", 'English save label');
replaceOnce("'save.saved': '花园进度已保存'", "'save.saved': '试玩进度已保存'", 'Chinese save label');
replaceOnce('...staticMessages.en,', "...staticMessages.en,\n    'preview.notice': 'Local preview · Test progress is separate from your main game.',", 'English preview notice');
replaceOnce('...staticMessages.zh,', "...staticMessages.zh,\n    'preview.notice': '本地试玩 · 试玩进度与正式游戏分开保存。',", 'Chinese preview notice');

const previewCopy = {
  en: {
    'static.pageTitle': 'A share of light — Level 27 bull-graph preview',
    'static.description': 'Test the new Master puzzle for level 27 on the bull graph. A self-contained bilingual preview with separate progress.',
    'static.helpStep3Title': 'Earn a golden bloom',
    'static.helpStep3Copy': 'This Master puzzle must be cleared in ' + level.budget + ' moves, the verified minimum. Meet every target together to earn a golden bloom. Undo or restart whenever you like. This preview keeps its progress separate from the full campaign.'
  },
  zh: {
    'static.pageTitle': '流光花园 — 第 27 关牛图试玩',
    'static.description': '试玩以牛图为结构的第 27 关大师谜题。支持中英切换，试玩进度独立保存。',
    'static.helpStep3Title': '挑战金色花朵',
    'static.helpStep3Copy': '本大师关卡须在 ' + level.budget + ' 步内通关，这也是已严格验证的最少步数。让所有目标同时达标，即可获得金色花朵。你可以随时撤销或重来。试玩进度与完整游戏分开保存。'
  }
};
for (const language of ['en', 'zh']) {
  for (const [key, value] of Object.entries(previewCopy[language])) {
    const before = JSON.stringify(key) + ': ' + JSON.stringify(staticMessages[language][key]);
    replaceOnce(before, JSON.stringify(key) + ': ' + JSON.stringify(value), language + ' ' + key);
  }
}

const milestoneMatch = html.match(/function scheduleMilestone\(delay = 0\) \{[\s\S]*?\n\}/);
if (!milestoneMatch) throw new Error('Missing milestone scheduler.');
replaceOnce(milestoneMatch[0], 'function scheduleMilestone() {\n  clearTimeout(milestoneTimer);\n  progress.milestonesPending = [];\n}', 'milestone scheduler');

replaceOnce('<main>', '<main>\n      <p class="local-preview-notice" data-i18n="preview.notice">Local preview · Test progress is separate from your main game.</p>', 'main element');
replaceOnce('</head>', `<style data-source="local-preview">
.journey, #levels-button, #next-level { display: none !important; }
.local-preview-notice { margin: 0 0 16px; padding: 9px 13px; border: 1px solid rgba(49, 100, 69, .17); border-radius: 12px; color: #365b43; background: rgba(235, 243, 223, .7); font-size: 12px; line-height: 1.5; }
@media (max-width: 600px) { .local-preview-notice { margin-bottom: 12px; padding: 8px 10px; font-size: 11px; } }
</style>\n</head>`, 'head closing tag');

// Parse the exact shipped program as JavaScript, and reject accidental
// dependencies or production save access before writing the downloadable file.
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(match => !match[0].includes('type="application/json"'));
if (inlineScripts.length !== 1) throw new Error('Expected one embedded program.');
new Script(inlineScripts[0][1], { filename: 'level-27-bull-preview.html' });
for (const key of keyMap.keys()) if (html.includes("'" + key + "'")) throw new Error('Production storage key remained: ' + key);
if (/<script\b[^>]*\bsrc\s*=/i.test(html) || /<link\b[^>]*\brel\s*=\s*['"]stylesheet['"]/i.test(html)) throw new Error('Preview has an external runtime dependency.');
const finalData = JSON.parse(html.match(/<script id="level-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
if (finalData.length !== 1 || finalData[0].id !== previewId || Object.hasOwn(finalData[0], 'solution')) throw new Error('Invalid preview data.');

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath + '.tmp', html, 'utf8');
await rename(outputPath + '.tmp', outputPath);
if (downloadPath && downloadPath !== outputPath) {
  await mkdir(path.dirname(downloadPath), { recursive: true });
  await copyFile(outputPath, downloadPath);
}
console.log(JSON.stringify({
  output: outputPath, download: downloadPath, bytes: Buffer.byteLength(html, 'utf8'),
  previewLevel: previewNumber, stableId: previewId, moves: level.budget,
  isolatedProgress: true, campaignMilestones: false, embeddedAssets: build.embeddedAssets
}, null, 2));
