import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A deliberately small, dependency-free packager for this game's own modules.
// It keeps each module in a separate closure, then embeds all game assets so
// local-test/index.html also runs directly from a file:// URL.
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(projectDirectory, 'docs');
const outputDirectory = path.join(projectDirectory, 'local-test');
const outputPath = path.join(outputDirectory, 'index.html');
const arguments_ = process.argv.slice(2);
let downloadPath;
if (arguments_.length) {
  if (arguments_.length !== 2 || arguments_[0] !== '--download') {
    throw new Error('Usage: node build-local.mjs [--download /absolute/output.html]');
  }
  downloadPath = path.resolve(arguments_[1]);
}

const mimeTypes = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const embeddedAssets = new Set();

function localPath(reference, fromDirectory = sourceDirectory) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(reference)) {
    throw new Error('The local build cannot load an external resource: ' + reference);
  }
  const resolved = path.resolve(fromDirectory, reference.split(/[?#]/)[0]);
  const relative = path.relative(sourceDirectory, resolved);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('Resource is outside the game source directory: ' + reference);
  }
  return resolved;
}

async function assetDataUrl(reference, fromDirectory = sourceDirectory) {
  if (/^data:/i.test(reference) || reference.startsWith('#')) return reference;
  const filename = localPath(reference, fromDirectory);
  const mime = mimeTypes[path.extname(filename).toLowerCase()];
  if (!mime) throw new Error('Unsupported embedded asset type: ' + reference);
  const bytes = await readFile(filename);
  embeddedAssets.add(path.relative(sourceDirectory, filename));
  return 'data:' + mime + ';base64,' + bytes.toString('base64');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(["\'])([\\s\\S]*?)\\1', 'i'));
  return match ? match[2] : null;
}

async function inlineCss(reference) {
  const filename = localPath(reference);
  const css = await readFile(filename, 'utf8');
  if (/^\s*@import\b/m.test(css)) {
    throw new Error('CSS @import must be resolved before creating the local build: ' + reference);
  }
  const urlPattern = /url\(\s*(?:(['"])([\s\S]*?)\1|([^)]*))\s*\)/g;
  let result = '';
  let position = 0;
  for (const match of css.matchAll(urlPattern)) {
    result += css.slice(position, match.index);
    const original = (match[2] ?? match[3]).trim();
    result += 'url("' + await assetDataUrl(original, path.dirname(filename)) + '")';
    position = match.index + match[0].length;
  }
  return result + css.slice(position);
}

const modules = new Map();
const moduleOrder = [];
const visiting = new Set();
const importPattern = /^[ \t]*import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2\s*;?[ \t]*$/gm;
const identifierPattern = /^[A-Za-z_$][\w$]*$/;

function namedBindings(source) {
  return source.split(',').map(binding => binding.trim()).filter(Boolean).map(binding => {
    const parts = binding.split(/\s+as\s+/);
    if (parts.length > 2 || !parts.every(name => identifierPattern.test(name))) {
      throw new Error('Unsupported module binding: ' + binding);
    }
    return { imported: parts[0], local: parts[1] || parts[0] };
  });
}

async function visitModule(filename) {
  const id = path.relative(sourceDirectory, filename).split(path.sep).join('/');
  if (modules.has(id)) return id;
  if (visiting.has(id)) throw new Error('Cyclic modules are not supported in the local build: ' + id);
  visiting.add(id);
  let code = await readFile(filename, 'utf8');
  const imports = [];
  for (const match of code.matchAll(importPattern)) {
    const dependencyFilename = localPath(match[3], path.dirname(filename));
    const dependency = await visitModule(dependencyFilename);
    imports.push({ dependency, bindings: namedBindings(match[1]) });
  }
  code = code.replace(importPattern, '');
  if (/^\s*import\b/m.test(code) || /\bimport\s*[.(]/.test(code)) {
    throw new Error('Only local, named imports are supported in the local build: ' + id);
  }
  // Mutable state should be accessed through an exported function. This keeps
  // language changes live without implementing a general-purpose JS parser.
  if (/\bexport\s+(?:let|var)\s/.test(code)) {
    throw new Error('Export a getter for mutable module state: ' + id);
  }
  const exports = new Map();
  code = code.replace(/\bexport\s+((?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][\w$]*))/g, (_, declaration, name) => {
    exports.set(name, name);
    return declaration;
  });
  code = code.replace(/\bexport\s*\{([^}]+)\}\s*;?/g, (_, bindings) => {
    for (const binding of namedBindings(bindings)) exports.set(binding.local, binding.imported);
    return '';
  });
  if (/^\s*export\b/m.test(code)) throw new Error('Unsupported export in ' + id);
  modules.set(id, { code, imports, exports });
  moduleOrder.push(id);
  visiting.delete(id);
  return id;
}

function bundledJavaScript() {
  const output = ['(() => {', '"use strict";', 'const __gameModules = Object.create(null);'];
  for (const id of moduleOrder) {
    const module = modules.get(id);
    output.push('// ' + id, '__gameModules[' + JSON.stringify(id) + '] = (() => {');
    for (const item of module.imports) {
      const dependency = modules.get(item.dependency);
      for (const binding of item.bindings) {
        if (!dependency.exports.has(binding.imported)) {
          throw new Error('Missing export ' + binding.imported + ' in ' + item.dependency);
        }
      }
      const bindings = item.bindings.map(binding => binding.imported === binding.local ? binding.imported : binding.imported + ': ' + binding.local).join(', ');
      output.push('const { ' + bindings + ' } = __gameModules[' + JSON.stringify(item.dependency) + '];');
    }
    output.push(module.code);
    output.push('return { ' + [...module.exports].map(([exported, local]) => exported === local ? local : JSON.stringify(exported) + ': ' + local).join(', ') + ' };');
    output.push('})();');
  }
  output.push('})();');
  return output.join('\n');
}

let html = await readFile(path.join(sourceDirectory, 'index.html'), 'utf8');
let styleCount = 0;
let result = '';
let position = 0;
for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
  result += html.slice(position, match.index);
  const tag = match[0];
  const rel = attribute(tag, 'rel');
  const href = attribute(tag, 'href');
  if (rel === 'stylesheet' && href) {
    result += '<style data-source="' + href + '">\n' + (await inlineCss(href)).replace(/<\/style/gi, '<\\/style') + '\n</style>';
    styleCount++;
  } else if (rel === 'icon' && href) {
    result += tag.replace(href, await assetDataUrl(href));
  } else {
    throw new Error('Unexpected link resource; resolve it before creating the local build: ' + tag);
  }
  position = match.index + tag.length;
}
html = result + html.slice(position);

const entryScripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1[^>]*>\s*<\/script\s*>/gi)];
if (entryScripts.length !== 1 || attribute(entryScripts[0][0], 'type') !== 'module') {
  throw new Error('Expected exactly one module script entry point in docs/index.html.');
}
const entryFilename = localPath(entryScripts[0][2]);
const entryId = await visitModule(entryFilename);
if (!/['"]level-data['"]/.test(modules.get(entryId).code)) {
  throw new Error('The game must read embedded #level-data before its fetch fallback.');
}
html = html.replace(entryScripts[0][0], '');
// Keep the brand link inside the downloaded game instead of navigating to a
// directory listing when someone opens the HTML using file://.
html = html.replace(/<a\b[^>]*>/gi, tag => {
  if ((attribute(tag, 'class') || '').split(/\s+/).includes('brand') && attribute(tag, 'href') === './') {
    return tag.replace(/\bhref\s*=\s*(['"])\.\/\1/i, 'href="#"');
  }
  return tag;
});

const levelData = JSON.parse(await readFile(path.join(sourceDirectory, 'levels.json'), 'utf8'));
const encodedData = JSON.stringify(levelData).replace(/</g, '\\u003c');
const script = bundledJavaScript().replace(/<\/script/gi, '<\\/script');
const payload = '\n<script id="level-data" type="application/json">' + encodedData + '</script>\n<script>\n' + script + '\n</script>\n';
if (!/<\/body\s*>/i.test(html)) throw new Error('Missing closing body tag.');
html = html.replace(/<\/body\s*>/i, payload + '</body>');
if (/<script\b[^>]*\bsrc\s*=/i.test(html) || /<link\b[^>]*\brel\s*=\s*['"]stylesheet['"]/i.test(html)) {
  throw new Error('A runtime source dependency was not embedded.');
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath + '.tmp', html, 'utf8');
await rename(outputPath + '.tmp', outputPath);
if (downloadPath && downloadPath !== outputPath) {
  await mkdir(path.dirname(downloadPath), { recursive: true });
  await copyFile(outputPath, downloadPath);
}
console.log(JSON.stringify({
  output: outputPath,
  download: downloadPath || null,
  bytes: Buffer.byteLength(html, 'utf8'),
  styles: styleCount,
  modules: moduleOrder,
  embeddedAssets: [...embeddedAssets],
  levels: levelData.length,
}, null, 2));
