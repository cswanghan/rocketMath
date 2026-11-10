// After `cap sync`, drop pages that sell outside the App Store from the iOS copy.
// The website build in dist/ is left untouched.
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = join('ios', 'App', 'App', 'public');
const files = ['support.html', 'support-sea.html', 'admin.html'];

for (const file of files) {
  await rm(join(root, file), { force: true });
}

console.log(`removed commerce/admin pages from ${root}`);
