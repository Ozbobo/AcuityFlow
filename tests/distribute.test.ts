import { describe, it, expect } from 'vitest';
import { distribute } from '../src/lib/distribute';
import { createEmptyRooms, getRoom } from '../src/lib/floor';
import { Room, Criticality, SCORE } from '../src/lib/types';

function occupy(rooms: Room[], spec: Record<number, Criticality>): Room[] {
  const out = rooms.map((r) => ({ ...r }));
  for (const [numStr, level] of Object.entries(spec)) {
    const r = getRoom(out, Number(numStr));
    if (r) {
      r.occupied = true;
      r.criticality = level;
    }
  }
  return out;
}

function scoreOfRooms(rooms: Room[], roomNumbers: number[]): number {
  return roomNumbers.reduce((sum, n) => {
    const r = getRoom(rooms, n);
    if (!r || !r.criticality) return sum;
    return sum + SCORE[r.criticality];
  }, 0);
}

describe('distribute', () => {
  it('returns N empty RNs when census is empty', () => {
    const rooms = createEmptyRooms();
    const rns = distribute(rooms, 3);
    expect(rns).toHaveLength(3);
    expect(rns.every((rn) => rn.assignedRooms.length === 0)).toBe(true);
  });

  it('single patient is assigned to first RN', () => {
    const rooms = occupy(createEmptyRooms(), { 915: 'high' });
    const rns = distribute(rooms, 2);
    expect(rns[0].assignedRooms).toEqual([915]);
    expect(rns[1].assignedRooms).toEqual([]);
  });

  it('6 equal-criticality patients among 3 RNs → 2 each', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'medium', 917: 'medium', 919: 'medium',
      921: 'medium', 923: 'medium', 925: 'medium',
    });
    const rns = distribute(rooms, 3);
    expect(rns).toHaveLength(3);
    rns.forEach((rn) => expect(rn.assignedRooms).toHaveLength(2));
  });

  it('score balance: 3 highs + 3 lows among 2 RNs', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'high', 919: 'high',
      921: 'low',  923: 'low',  925: 'low',
    });
    const rns = distribute(rooms, 2);
    const scores = rns.map((rn) => scoreOfRooms(rooms, rn.assignedRooms));
    const diff = Math.abs(scores[0] - scores[1]);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('every RN gets a contiguous position range', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'medium', 919: 'low',
      921: 'high', 923: 'medium', 925: 'low',
      927: 'high', 929: 'medium',
    });
    const rns = distribute(rooms, 3);
    for (const rn of rns) {
      if (rn.assignedRooms.length < 2) continue;
      const positions = rn.assignedRooms
        .map((n) => getRoom(rooms, n)!.position)
        .sort((a, b) => a - b);
      // contiguous means max - min == (unique positions count - 1)
      const unique = Array.from(new Set(positions));
      expect(unique[unique.length - 1] - unique[0]).toBe(unique.length - 1);
    }
  });

  it('zone can span the station (High to Low)', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'medium', 916: 'medium', 901: 'medium', 902: 'medium',
    });
    const rns = distribute(rooms, 1);
    expect(rns[0].assignedRooms.sort()).toEqual([901, 902, 915, 916]);
  });

  it('6 highs among 2 RNs → 3 highs each', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'high', 919: 'high',
      921: 'high', 923: 'high', 925: 'high',
    });
    const rns = distribute(rooms, 2);
    expect(rns[0].assignedRooms).toHaveLength(3);
    expect(rns[1].assignedRooms).toHaveLength(3);
  });

  it('fewer patients than RNs → extras are empty', () => {
    const rooms = occupy(createEmptyRooms(), { 915: 'high', 917: 'low' });
    const rns = distribute(rooms, 4);
    expect(rns).toHaveLength(4);
    const nonEmpty = rns.filter((rn) => rn.assignedRooms.length > 0);
    expect(nonEmpty).toHaveLength(2);
  });

  it('does not crash with 0 RNs', () => {
    const rooms = occupy(createEmptyRooms(), { 915: 'high' });
    expect(() => distribute(rooms, 0)).not.toThrow();
    expect(distribute(rooms, 0)).toEqual([]);
  });

  it('spreads highs: 2 highs + 2 lows among 2 RNs → each RN gets 1 high', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'low',
      919: 'low', 921: 'high',
    });
    const rns = distribute(rooms, 2);
    const highsPerRn = rns.map((rn) =>
      rn.assignedRooms.filter((n) => getRoom(rooms, n)!.criticality === 'high').length
    );
    expect(Math.max(...highsPerRn)).toBe(1);
    expect(Math.min(...highsPerRn)).toBe(1);
  });

  it('spreads highs: when fewer highs than RNs, no RN gets 2 highs', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'low', 919: 'low',
      921: 'low', 923: 'high', 925: 'low',
    });
    const rns = distribute(rooms, 3);
    const highsPerRn = rns.map((rn) =>
      rn.assignedRooms.filter((n) => getRoom(rooms, n)!.criticality === 'high').length
    );
    // 2 highs, 3 RNs → no RN should have 2 while another has 0
    expect(Math.max(...highsPerRn)).toBeLessThanOrEqual(1);
  });

  it('spreads highs: more highs than RNs → doubling is necessary and OK', () => {
    const rooms = occupy(createEmptyRooms(), {
      915: 'high', 917: 'high', 919: 'high', 921: 'high',
    });
    const rns = distribute(rooms, 2);
    const highsPerRn = rns.map((rn) =>
      rn.assignedRooms.filter((n) => getRoom(rooms, n)!.criticality === 'high').length
    );
    // All RNs have at least 1 high — doubling is then allowed
    expect(Math.min(...highsPerRn)).toBeGreaterThanOrEqual(1);
  });

  it('fuzz test: score spread stays small across random censuses', () => {
    const levels: Criticality[] = ['high', 'medium', 'low'];
    const allRoomNumbers = createEmptyRooms().map((r) => r.number);
    const rng = mulberry32(42);

    for (let trial = 0; trial < 50; trial++) {
      const count = 5 + Math.floor(rng() * 20); // 5..24 patients
      const picked = shuffle(allRoomNumbers.slice(), rng).slice(0, count);
      const spec: Record<number, Criticality> = {};
      for (const n of picked) {
        spec[n] = levels[Math.floor(rng() * 3)];
      }
      const rooms = occupy(createEmptyRooms(), spec);
      const rnCount = 2 + Math.floor(rng() * 4); // 2..5 RNs
      const rns = distribute(rooms, rnCount);
      const scores = rns.map((rn) => scoreOfRooms(rooms, rn.assignedRooms));
      const nonZero = scores.filter((_, i) => rns[i].assignedRooms.length > 0);
      if (nonZero.length < 2) continue;
      const spread = Math.max(...nonZero) - Math.min(...nonZero);
      expect(spread).toBeLessThanOrEqual(3); // within one HIGH unit
    }
  });
});

// Deterministic small RNG for fuzz tests
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
