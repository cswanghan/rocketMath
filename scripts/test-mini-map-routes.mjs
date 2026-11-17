// Real map page handlers with local packaged data and an in-memory wx adapter.
// Run separately: node scripts/test-mini-map-routes.mjs. No browser/WeChat UI.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const pagePath = fileURLToPath(new URL('../apps/mini/packages/math/pages/map/map.js', import.meta.url));
const requirePage = createRequire(pagePath);
const source = readFileSync(pagePath, 'utf8');
const template = readFileSync(pagePath.replace(/\.js$/, '.wxml'), 'utf8');
const store = new Map();
let destination = '';
const originalWx = globalThis.wx;
const wx = {
  getStorageSync: key => store.get(key) ?? '',
  setStorageSync: (key, value) => store.set(key, value),
  removeStorageSync: key => store.delete(key),
  setNavigationBarTitle() {}, showToast() {},
  showModal() { throw new Error('Unexpected map load error'); },
  navigateTo: ({ url }) => { destination = url; },
  redirectTo: ({ url }) => { destination = url; },
  switchTab: ({ url }) => { destination = url; },
};
const tap = dataset => ({ currentTarget: { dataset } });
const flush = () => new Promise(resolve => setImmediate(resolve));
function makePage() {
  let definition;
  vm.runInNewContext(source, {
    wx, Page: value => { definition = value; },
    require: name => name.endsWith('/utils/track.js') ? { track() {} } : requirePage(name),
  }, { filename: pagePath });
  const page = { ...definition, data: structuredClone(definition.data) };
  page.setData = patch => Object.assign(page.data, patch);
  return page;
}

let checks = 0;
try {
  globalThis.wx = wx;
  for (const grade of [3, 4, 5, 6, 7, 8, 9]) {
    const page = makePage();
    page.onLoad({ grade });
    page.onShow();
    await flush();
    assert.equal(page.data.ready, true);
    const topics = page.data.terms.flatMap(term => term.units.flatMap(unit => unit.topics));
    const actualTracks = [...new Set([...topics.map(topic => topic.trackId).filter(Boolean), ...page.data.extraTracks.map(track => track.trackId)])].sort();
    const expectedTracks = page.content.pack.tracks.filter(track => track.enabled).map(track => track.trackId).sort();
    assert.deepEqual(actualTracks, expectedTracks, `grade ${grade}: an enabled track is unreachable`);
    assert.deepEqual([...page.data.extraTracks.map(track => track.trackId)], grade === 7 ? ['rational_mul_div'] : []);
    checks++;

    const dual = topics.filter(topic => topic.kind === 'practice' && topic.trackId);
    assert.equal(dual.length, ({ 6: 4, 7: 3, 8: 5, 9: 5 })[grade] ?? 0);
    for (const topic of dual) {
      assert.ok(topic.cells.length > 0);
      page.onTopic(tap({ kind: topic.kind, setid: topic.setId, trackid: topic.trackId }));
      assert.equal(destination, `/packages/math/pages/practice/practice?grade=${grade}&setId=${topic.setId}`);
      page.hasGate = false;
      page.onFluency(tap({ trackid: topic.trackId }));
      assert.equal(destination, `/packages/math/pages/probe/probe?grade=${grade}&trackId=${topic.trackId}`);
      page.hasGate = true;
      page.onFluency(tap({ trackid: topic.trackId }));
      assert.equal(destination, `/packages/math/pages/play/play?grade=${grade}&trackId=${topic.trackId}`);
      page.onRace(tap({ trackid: topic.trackId }));
      assert.equal(destination, `/packages/math/pages/race/race?grade=${grade}&trackId=${topic.trackId}`);
      checks++;
    }
  }

  store.set('rm.student.local', { id: 'local', latencyGateMs: 4500, xp: 200 });
  store.set('rm.track.local.rational_mul_div', { completedLevels: ['A'], currentLevel: 'B' });
  const page = makePage();
  page.onLoad({ grade: 7 });
  page.onShow();
  await flush();
  const extra = page.data.extraTracks[0];
  assert.equal(extra.trackId, 'rational_mul_div');
  assert.equal(extra.cells[0].state, 'done');
  assert.equal(extra.cells[1].state, 'current');
  assert.equal(page.hasGate, true);
  page.onFluency(tap({ trackid: extra.trackId }));
  assert.equal(destination, '/packages/math/pages/play/play?grade=7&trackId=rational_mul_div');
  page.onRace(tap({ trackid: extra.trackId }));
  assert.equal(destination, '/packages/math/pages/race/race?grade=7&trackId=rational_mul_div');
  checks++;

  const before = destination;
  page.onFluency(tap({ trackid: 'missing' }));
  page.onRace(tap({ trackid: 'missing' }));
  assert.equal(destination, before);
  checks++;

  // Secondary buttons must stop bubbling; otherwise oral clicks also trigger
  // the parent card's comprehensive-practice route.
  assert.match(template, /data-trackid="\{\{item\.trackId\}\}"\s+catchtap="onFluency"/);
  assert.match(template, /catchtap="onRace"/);
  checks++;
  console.log(`Mini map routes: ${checks} checks passed (all grades, 17 dual cards, extra track, saved progress, warm-up and race).`);
} finally {
  if (originalWx === undefined) delete globalThis.wx;
  else globalThis.wx = originalWx;
}
