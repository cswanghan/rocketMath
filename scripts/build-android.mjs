import { build } from 'vite';
import { build as bundle } from 'esbuild';
import { readFile, writeFile, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('dist-android');
await build({ build: { outDir: out, emptyOutDir: true } });
await bundle({ entryPoints: ['src/platform/android-runtime.ts'], outfile: `${out}/native-runtime.js`, bundle: true, format: 'iife', target: 'chrome100', minify: true });
await cp('src/platform/android.css', `${out}/native.css`);
const vendors = [
  ['hanzi-writer/dist/hanzi-writer.min.js', 'hanzi-writer.min.js'],
  ['cnchar/cnchar.min.js', 'cnchar.min.js'],
  ['cnchar-poly/cnchar.poly.min.js', 'cnchar.poly.min.js'],
  ['cnchar-radical/cnchar.radical.min.js', 'cnchar.radical.min.js'],
];
await mkdir(`${out}/vendor`, { recursive: true });
for (const [source, file] of vendors) await cp(`node_modules/${source}`, `${out}/vendor/${file}`);
await mkdir(`${out}/vendor/hanzi-data`, { recursive: true });
for (const file of await readdir('node_modules/hanzi-writer-data')) {
  if (file.endsWith('.json') && file !== 'package.json') await cp(`node_modules/hanzi-writer-data/${file}`, `${out}/vendor/hanzi-data/${file}`);
}
await mkdir(`${out}/licenses`, { recursive: true });
for (const [pkg, license] of [
  ['hanzi-writer', 'LICENSE'], ['hanzi-writer-data', 'ARPHICPL.TXT'], ['hanzi-writer-data', 'README.md'],
  ['cnchar', 'LICENSE'], ['cnchar-poly', 'LICENSE'], ['cnchar-radical', 'LICENSE'],
  ['react', 'LICENSE'], ['react-dom', 'LICENSE'], ['@capacitor/core', 'LICENSE'], ['@capacitor/android', 'LICENSE'], ['@capacitor/app', 'LICENSE'],
]) await cp(`node_modules/${pkg}/${license}`, `${out}/licenses/${pkg.replaceAll('/', '-')}-${license}.txt`);
// Do not bundle website administration, print-store/payment or OAuth completion pages.
for (const file of ['admin.html', 'app-support.html', 'privacy.html', 'support.html', 'support-sea.html', 'complete-username.html', 'pay-wechat.png', 'pay-alipay.png', 'samples', '_redirects']) {
  await rm(`${out}/${file}`, { recursive: true, force: true });
}
for (const file of (await readdir(out)).filter(file => file.endsWith('.html'))) {
  let html = await readFile(`${out}/${file}`, 'utf8');
  html = html.replace(/<a\b[^>]*href="\/support\.html[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<link\b[^>]*https:\/\/fonts\.[^>]*>/g, '')
    .replace(/<script\b[^>]*src="https:\/\/accounts\.google\.com[^>]*><\/script>/g, '')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer@3\.5\.0\/dist\//g, '/vendor/')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/cnchar(?:-poly|-radical)?\//g, '/vendor/')
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data@2\.0\//g, '/vendor/hanzi-data/')
    .replace(/,?\s*viewport-fit=cover/g, '')
    .replace('<head>', '<head>\n<script src="/native-runtime.js"></script>')
    .replace('</head>', '<link rel="stylesheet" href="/native.css"></head>');
  if (file === 'login.html') html = html.replace('<div class="divider"><span>或</span></div>', '')
    .replace('<div class="google-btn-wrap" id="googleBtnWrap"></div>', '');
  if (/<(?:script|link)\b[^>]*(?:src|href)="https?:\/\//.test(html.replace(/<link\b[^>]*rel="canonical"[^>]*>/g, ''))) {
    throw new Error(`Remote startup resource in ${file}`);
  }
  await writeFile(`${out}/${file}`, html);
}
// Fail the build instead of shipping dead links or missing local startup files.
for (const file of (await readdir(out)).filter(file => file.endsWith('.html'))) {
  const html = await readFile(`${out}/${file}`, 'utf8');
  for (const match of html.matchAll(/(?:href|src)=(["'])(\/(?!\/)[^"'<>]*)\1/g)) {
    const pathname = decodeURIComponent(new URL(match[2], 'https://localhost').pathname);
    if (pathname === '/') continue;
    await readFile(`${out}${pathname}`); // rejects missing bundled assets
  }
}
console.log('Android offline bundle ready (including stroke data and licenses).');
