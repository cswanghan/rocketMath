// 备考清单的掌握度聚合：组合现有 adapter 接口，把一个 Topic 归约为四态。
// 存储层零改动——口算走 getTrackState、练习走 getPractice，与 KnowledgeMap 判定一致。

import { getTrack, type ContentPack } from '../engine';
import type { Topic } from '../map/types';
import type { StorageAdapter } from '../storage';

export type MasteryState = 'mastered' | 'in_progress' | 'not_started' | 'unavailable';

export const MASTERY_LABEL: Record<MasteryState, string> = {
  mastered: '已掌握',
  in_progress: '进行中',
  not_started: '未开始',
  unavailable: '内容建设中',
};

function fluencyLevelCount(pack: ContentPack, trackId: string): number {
  try {
    return getTrack(pack, trackId).levels.length;
  } catch {
    return 0;
  }
}

/** 单个 topic 的掌握状态。topic 来自其所在年级的 knowledgeMap，pack 为同年级口算包。 */
export async function topicMastery(
  adapter: StorageAdapter,
  studentId: string,
  pack: ContentPack,
  topic: Topic,
): Promise<MasteryState> {
  if (topic.status !== 'ready') return 'unavailable';

  if (topic.fluencyTrackId) {
    const total = fluencyLevelCount(pack, topic.fluencyTrackId);
    if (total === 0) return 'unavailable';
    const state = await adapter.getTrackState(studentId, topic.fluencyTrackId);
    const done = state?.completedLevels?.length ?? 0;
    if (done >= total) return 'mastered';
    return done > 0 ? 'in_progress' : 'not_started';
  }

  if (topic.problemSetId) {
    const rec = await adapter.getPractice(studentId, topic.problemSetId);
    if (rec?.completed) return 'mastered';
    return rec && rec.bestFirstTry > 0 ? 'in_progress' : 'not_started';
  }

  return 'unavailable';
}
