import { describe, expect, it } from 'vitest';
import realPack from '../../content/grade3_math_fluency_pack.json';
import {
  computeFromPrompt,
  computeLatencyGateMs,
  ContentPackError,
  factById,
  getEnabledTracks,
  getTrack,
  nextLevel,
  orbitPool,
  takeOffPool,
  universePool,
  validatePack,
} from './contentPack';
import type { ContentPack } from './types';
import { baseEngineConfig, f, makePack, twoLevelPack } from './__fixtures__/packs';

describe('computeFromPrompt', () => {
  it('computes multiplication and division', () => {
    expect(computeFromPrompt('6 × 7')).toBe(42);
    expect(computeFromPrompt('42 ÷ 6')).toBe(7);
    expect(computeFromPrompt('20 × 3')).toBe(60);
    expect(computeFromPrompt('8 * 8')).toBe(64);
  });
  it('rejects non-integer division and divide-by-zero', () => {
    expect(computeFromPrompt('7 ÷ 2')).toBeNull();
    expect(computeFromPrompt('7 ÷ 0')).toBeNull();
  });
  it('rejects garbage', () => {
    expect(computeFromPrompt('hello')).toBeNull();
    expect(computeFromPrompt('1 + 1')).toBeNull();
  });
});

describe('validatePack', () => {
  it('accepts the real generated pack', () => {
    expect(() => validatePack(realPack as unknown as ContentPack)).not.toThrow();
  });

  it('every fact in the real pack has a computable, matching answer', () => {
    for (const t of (realPack as unknown as ContentPack).tracks) {
      for (const lvl of t.levels) {
        for (const fact of lvl.new_facts) {
          expect(computeFromPrompt(fact.prompt)).toBe(fact.answer);
        }
      }
    }
  });

  it('rejects a non-object', () => {
    expect(() => validatePack(null as unknown as ContentPack)).toThrow(ContentPackError);
  });

  it('rejects empty tracks', () => {
    expect(() => validatePack(makePack([]))).toThrow(/non-empty/);
  });

  it('rejects a mismatched answer', () => {
    const bad = makePack([
      {
        trackId: 'x',
        name: 'x',
        enabled: true,
        levels: [{ level: 'A', new_facts: [{ id: 'q', prompt: '2 × 2', answer: 5, learningType: 'fact_recall' }] }],
      },
    ]);
    expect(() => validatePack(bad)).toThrow(/!= computed/);
  });

  it('rejects duplicate fact ids', () => {
    const dup = makePack([
      {
        trackId: 'x',
        name: 'x',
        enabled: true,
        levels: [
          { level: 'A', new_facts: [f('same', 2, 2)] },
          { level: 'B', new_facts: [f('same', 2, 3)] },
        ],
      },
    ]);
    expect(() => validatePack(dup)).toThrow(/duplicate fact id/);
  });

  it('rejects an uncomputable prompt', () => {
    const bad = makePack([
      {
        trackId: 'x',
        name: 'x',
        enabled: true,
        levels: [{ level: 'A', new_facts: [{ id: 'q', prompt: 'banana', answer: 1, learningType: 'fact_recall' }] }],
      },
    ]);
    expect(() => validatePack(bad)).toThrow(/not computable/);
  });

  it('rejects a track with no levels', () => {
    const bad = makePack([{ trackId: 'x', name: 'x', enabled: true, levels: [] }]);
    expect(() => validatePack(bad)).toThrow(/no levels/);
  });

  it('rejects a track missing trackId', () => {
    const bad = makePack([{ name: 'x', enabled: true, levels: [{ level: 'A', new_facts: [f('z', 2, 2)] }] } as never]);
    expect(() => validatePack(bad)).toThrow(/missing trackId/);
  });

  it('rejects a level without a name', () => {
    const bad = makePack([{ trackId: 'x', name: 'x', enabled: true, levels: [{ new_facts: [f('z', 2, 2)] } as never] }]);
    expect(() => validatePack(bad)).toThrow(/without a name/);
  });

  it('rejects a duplicate level name', () => {
    const bad = makePack([
      {
        trackId: 'x',
        name: 'x',
        enabled: true,
        levels: [
          { level: 'A', new_facts: [f('z1', 2, 2)] },
          { level: 'A', new_facts: [f('z2', 2, 3)] },
        ],
      },
    ]);
    expect(() => validatePack(bad)).toThrow(/duplicate level/);
  });

  it('rejects a level with empty new_facts', () => {
    const bad = makePack([{ trackId: 'x', name: 'x', enabled: true, levels: [{ level: 'A', new_facts: [] }] }]);
    expect(() => validatePack(bad)).toThrow(/no new_facts/);
  });

  it('rejects a fact missing id', () => {
    const bad = makePack([
      { trackId: 'x', name: 'x', enabled: true, levels: [{ level: 'A', new_facts: [{ prompt: '2 × 2', answer: 4, learningType: 'fact_recall' } as never] }] },
    ]);
    expect(() => validatePack(bad)).toThrow(/missing id/);
  });

  it('rejects a fact with a non-numeric answer', () => {
    const bad = makePack([
      { trackId: 'x', name: 'x', enabled: true, levels: [{ level: 'A', new_facts: [{ id: 'q', prompt: '2 × 2', answer: 'four', learningType: 'fact_recall' } as never] }] },
    ]);
    expect(() => validatePack(bad)).toThrow(/answer is not a number/);
  });

  it('rejects a fact with an invalid learningType', () => {
    const bad = makePack([
      { trackId: 'x', name: 'x', enabled: true, levels: [{ level: 'A', new_facts: [{ id: 'q', prompt: '2 × 2', answer: 4, learningType: 'rote' } as never] }] },
    ]);
    expect(() => validatePack(bad)).toThrow(/invalid learningType/);
  });

  it('rejects an invalid engine_config', () => {
    const pack = twoLevelPack();
    const broken = { ...pack, engine_config: { ...pack.engine_config, latency_gate_seconds: 'x' } } as unknown as ContentPack;
    expect(() => validatePack(broken)).toThrow(/engine_config/);
  });
});

describe('track / level helpers', () => {
  const pack = realPack as unknown as ContentPack;

  it('getTrack throws on unknown track', () => {
    expect(() => getTrack(pack, 'nope')).toThrow(ContentPackError);
  });

  it('getEnabledTracks returns only enabled tracks', () => {
    const enabled = getEnabledTracks(pack);
    expect(enabled.map((t) => t.trackId)).toContain('mult_facts');
    expect(enabled.every((t) => t.enabled)).toBe(true);
  });

  it('nextLevel walks A->B and returns null at the end', () => {
    const t = getTrack(pack, 'mult_facts');
    expect(nextLevel(t, 'A')).toBe('B');
    expect(nextLevel(t, 'R')).toBeNull();
  });

  it('factById finds facts across levels', () => {
    const t = getTrack(pack, 'mult_facts');
    expect(factById(t, 'mult_2x2')?.answer).toBe(4);
    expect(factById(t, 'does_not_exist')).toBeUndefined();
  });
});

describe('derived pools', () => {
  const pack = twoLevelPack();
  const track = getTrack(pack, 'mult_facts');

  it('take_off pool = current level new_facts only', () => {
    expect(takeOffPool(track, 'A').map((x) => x.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('orbit pool at A = A only (no previous)', () => {
    expect(orbitPool(track, 'A').map((x) => x.id).sort()).toEqual(['a1', 'a2', 'a3', 'a4']);
  });

  it('orbit pool at B = B ∪ A', () => {
    const ids = orbitPool(track, 'B').map((x) => x.id).sort();
    expect(ids).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4']);
  });

  it('universe pool at B = A..B union', () => {
    const ids = universePool(track, 'B').map((x) => x.id).sort();
    expect(ids).toEqual(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4']);
  });

  it('real pack: universe pool grows with level index', () => {
    const t = getTrack(pack, 'mult_facts');
    void t;
    const real = getTrack(realPack as unknown as ContentPack, 'mult_facts');
    expect(universePool(real, 'A').length).toBe(4);
    expect(universePool(real, 'C').length).toBe(12);
  });
});

describe('computeLatencyGateMs', () => {
  it('median × multiplier, clamped to [min, max]', () => {
    // median 800ms × 2.5 = 2000ms = 2s -> within [2,6]
    expect(computeLatencyGateMs([700, 800, 900], baseEngineConfig)).toBe(2000);
  });
  it('clamps below min', () => {
    // median 100 × 2.5 = 250ms -> clamp up to 2000ms
    expect(computeLatencyGateMs([100, 100, 100], baseEngineConfig)).toBe(2000);
  });
  it('clamps above max', () => {
    // median 5000 × 2.5 = 12500ms -> clamp down to 6000ms
    expect(computeLatencyGateMs([5000, 5000], baseEngineConfig)).toBe(6000);
  });
  it('even-length median averages the two middle values', () => {
    // sorted [400,600] median 500 × 2.5 = 1250 -> clamp to 2000
    expect(computeLatencyGateMs([600, 400], baseEngineConfig)).toBe(2000);
  });
  it('empty probe falls back to configured gate', () => {
    expect(computeLatencyGateMs([], baseEngineConfig)).toBe(3000);
  });
});
