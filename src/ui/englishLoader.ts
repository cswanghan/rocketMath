import type { PracticePack } from '../practice';

// 英语阅读·语法练习包 (KET/PET)。与数学包同一 Practice 引擎,但不按年级组织,
// 单独加载;供「我要备考」清单中 pack:'english' 的知识点渲染。
let cache: PracticePack | null = null;

export async function loadEnglishPack(): Promise<PracticePack> {
  if (cache) return cache;
  const m = await import('../../content/english_practice_pack.json');
  cache = m.default as unknown as PracticePack;
  return cache;
}
