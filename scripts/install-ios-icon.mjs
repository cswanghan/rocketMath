// Copy the generated 1024 icon into the Xcode asset catalog.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const src = 'resources/AppIcon-1024.png';
const dir = join('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const filename = 'AppIcon-1024.png';
await mkdir(dir, { recursive: true });
await copyFile(src, join(dir, filename));

const contentsPath = join(dir, 'Contents.json');
let contents;
try {
  contents = JSON.parse(await readFile(contentsPath, 'utf8'));
} catch {
  contents = { images: [], info: { version: 1, author: 'xcode' } };
}
const images = Array.isArray(contents.images) ? contents.images : [];
let slot = images.find((image) => image.size === '1024x1024' || image.idiom === 'universal');
if (!slot) {
  slot = { idiom: 'universal', platform: 'ios', size: '1024x1024' };
  images.push(slot);
}
slot.filename = filename;
contents.images = images;
await writeFile(contentsPath, `${JSON.stringify(contents, null, 2)}\n`);
console.log(`installed ${filename}`);
