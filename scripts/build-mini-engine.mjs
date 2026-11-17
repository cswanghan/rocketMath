// 把 Web 端的纯逻辑编译进 apps/mini/vendor/。
//
// 分三步:
//   1. tsc 按 apps/mini/tsconfig.mini.json 编译
//   2. 删掉浏览器专用产物 —— tsc 会顺着 barrel (src/storage/index.ts) 把
//      IndexedDbAdapter 之类一起拉进来, 这些在小程序里 require 到就崩
//   3. 守卫: 扫描剩余产物, 出现浏览器全局就让构建失败
//
// 第 3 步是这套管线的价值所在: 将来谁在 src/engine 里手滑用了 window/fetch,
// 构建当场红, 而不是等孩子在手机上白屏。
//
// 用法: npm run mini:engine

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'apps', 'mini', 'vendor');

// 浏览器专用实现。小程序侧的对应物见 apps/mini/utils/。
const DROP = [
  'storage/index.js', // barrel, 会 require 下面两个
  'storage/indexedDb.js',
  'storage/memory.js',
  'map/map.js', // 硬 import grade3 JSON, 小程序的内容由 content/index.js 提供
];

// 出现即判定"泄漏了浏览器依赖"。用词边界匹配, 避免误伤注释里的 window_attempts。
const FORBIDDEN = [
  /\bindexedDB\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\s*\./,
  /\bwindow\s*\./,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bSpeechSynthesis/,
];

console.log('1/3  tsc 编译…');
execFileSync('npx', ['tsc', '-p', 'apps/mini/tsconfig.mini.json'], {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log('2/3  剔除浏览器专用产物…');
for (const rel of DROP) {
  const p = join(VENDOR, rel);
  try {
    rmSync(p);
    console.log(`     - ${rel}`);
  } catch {
    /* 该文件这次没被生成 */
  }
}

console.log('3/3  守卫: 扫描浏览器依赖…');
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const leaks = [];
const files = walk(VENDOR);
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // 逐行看, 好报出行号; 跳过注释行, 注释里提到 window 是无害的
  src.split('\n').forEach((line, i) => {
    const code = line.trim();
    if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
    for (const re of FORBIDDEN) {
      if (re.test(code)) leaks.push(`${relative(ROOT, file)}:${i + 1}  ${code.slice(0, 90)}`);
    }
  });
}

if (leaks.length) {
  console.error('\n❌ vendor 产物里出现了浏览器 API —— 小程序运行时会崩:');
  leaks.forEach((l) => console.error('   ' + l));
  console.error(
    '\n   修法: 把该逻辑移出 tsconfig.mini.json 的 include, 并在 apps/mini/utils/ 写一份小程序实现。',
  );
  process.exit(1);
}

console.log(`✅ vendor 就绪, ${files.length} 个模块, 无浏览器依赖`);
