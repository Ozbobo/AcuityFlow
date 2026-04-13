import { describe, it, expect } from 'vitest';
import { recommend } from '../src/lib/recommend';
import { createEmptyRooms, getRoom } from '../src/lib/floor';
import { ShiftState, Criticality, RN } from '../src/lib/types';

function buildState(args: {
  ratio: number;
  rns: Record<number, number[]>; // rnId -> room numbers
  criticalities: Record<number, Criticality>;
}): ShiftState {
  const rooms = createEmptyRooms();
  for (const [numStr, level] of Object.entries(args.criticalities)) {
    const r = getRoom(rooms, Number(numStr))!;
    r.occupied = true;
    r.criticality = level;
  }
  const rns: RN[] = Object.entries(args.rns).map(([idStr, nums]) => {
    const id = Number(idStr);
    for (const n of nums) {
      const r = getRoom(rooms, n);
      if (r) r.assignedTo = id;
    }
    return { id, assignedRooms: nums, locked: false };
  });
  return { ratio: args.ratio, rnCount: rns.length, rooms, rns };
}

describe('recommend', () => {
  it('returns at most 3 suggestions', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [917], 2: [919], 3: [921] },
      criticalities: { 915: 'medium', 917: 'medium', 919: 'medium', 921: 'medium' },
    });
    const result = recommend(923, 'medium', state);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('excludes RNs at capacity (ratio cap)', () => {
    const state = buildState({
      ratio: 2,
      rns: { 0: [915, 917], 1: [919] }, // RN0 is at cap
      criticalities: { 915: 'medium', 917: 'medium', 919: 'medium' },
    });
    const result = recommend(921, 'low', state);
    expect(result.find((s) => s.rnId === 0)).toBeUndefined();
    expect(result.find((s) => s.rnId === 1)).toBeDefined();
  });

  it('returns empty array when all RNs are capped', () => {
    const state = buildState({
      ratio: 1,
      rns: { 0: [915], 1: [917] },
      criticalities: { 915: 'medium', 917: 'medium' },
    });
    const result = recommend(919, 'low', state);
    expect(result).toEqual([]);
  });

  it('ranks nearer RN higher when workloads are equal', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [929] }, // equal workload (both medium), RN0 is near room 917
      criticalities: { 915: 'medium', 929: 'medium' },
    });
    const result = recommend(917, 'medium', state);
    expect(result[0].rnId).toBe(0);
  });

  it('ranks lighter-load RN higher when distances are equal', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915, 917, 919], 1: [921] }, // RN0 heavier
      criticalities: { 915: 'high', 917: 'high', 919: 'high', 921: 'low' },
    });
    // both have a room one away from 923; RN1 is lighter
    const result = recommend(923, 'medium', state);
    expect(result[0].rnId).toBe(1);
  });

  it('each suggestion has a non-empty reason string', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [917] },
      criticalities: { 915: 'medium', 917: 'medium' },
    });
    const result = recommend(919, 'low', state);
    expect(result.length).toBeGreaterThan(0);
    for (const s of result) {
      expect(s.reason).toBeTruthy();
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });

  it('ignores RNs that have no rooms yet but are within capacity', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [] },
      criticalities: { 915: 'medium' },
    });
    const result = recommend(917, 'low', state);
    // Both should appear; RN with rooms has minDistance to 917 = 1, empty RN has 0
    expect(result.map((s) => s.rnId).sort()).toEqual([0, 1]);
  });

  it('excludes locked RNs from suggestions', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [917] },
      criticalities: { 915: 'medium', 917: 'medium' },
    });
    state.rns[0].locked = true;
    const result = recommend(919, 'low', state);
    expect(result.find((s) => s.rnId === 0)).toBeUndefined();
    expect(result.find((s) => s.rnId === 1)).toBeDefined();
  });

  it('returns empty when all RNs are locked', () => {
    const state = buildState({
      ratio: 5,
      rns: { 0: [915], 1: [917] },
      criticalities: { 915: 'medium', 917: 'medium' },
    });
    state.rns[0].locked = true;
    state.rns[1].locked = true;
    const result = recommend(919, 'low', state);
    expect(result).toEqual([]);
  });
});
