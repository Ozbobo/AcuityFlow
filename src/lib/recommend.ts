import { Criticality, RN, ShiftState, SCORE, Suggestion } from './types';
import { distance, getRoom } from './floor';

const DISTANCE_WEIGHT = 2.0;
const WORKLOAD_WEIGHT = 1.5;
const MIX_WEIGHT = 1.0;

export function recommend(
  newRoom: number,
  newLevel: Criticality,
  state: ShiftState
): Suggestion[] {
  // Step 1: hard filter — drop RNs at or above capacity
  const eligible = state.rns.filter(
    (rn) => !rn.locked && rn.assignedRooms.length < state.ratio
  );

  if (eligible.length === 0) return [];

  // Step 2: score each eligible RN
  const scored = eligible.map((rn) => {
    const d = minDistance(newRoom, rn.assignedRooms);
    const currentLoad = computeLoad(rn, state);
    const projectedLoad = currentLoad + SCORE[newLevel];
    const projectedMix = projectedMixPenalty(rn, state, newLevel);

    const score =
      DISTANCE_WEIGHT * d +
      WORKLOAD_WEIGHT * projectedLoad +
      MIX_WEIGHT * projectedMix;

    const reason = buildReason(rn, d, projectedLoad, state.ratio);
    return { rnId: rn.id, score, reason };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 3);
}

function minDistance(newRoom: number, roomNumbers: number[]): number {
  if (roomNumbers.length === 0) return 0;
  let min = Infinity;
  for (const n of roomNumbers) {
    const d = distance(newRoom, n);
    if (d < min) min = d;
  }
  return min;
}

function computeLoad(rn: RN, state: ShiftState): number {
  return rn.assignedRooms.reduce((sum, n) => {
    const r = getRoom(state.rooms, n);
    if (!r || !r.criticality) return sum;
    return sum + SCORE[r.criticality];
  }, 0);
}

function projectedMixPenalty(
  rn: RN,
  state: ShiftState,
  newLevel: Criticality
): number {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const n of rn.assignedRooms) {
    const r = getRoom(state.rooms, n);
    if (r && r.criticality) counts[r.criticality]++;
  }
  counts[newLevel]++;
  const vals = [counts.high, counts.medium, counts.low];
  return Math.max(...vals) - Math.min(...vals);
}

function buildReason(
  rn: RN,
  d: number,
  projectedLoad: number,
  ratio: number
): string {
  const displayId = rn.id + 1;
  const maxLoad = ratio * SCORE.high;
  const distPart =
    d === 0
      ? 'empty load, zero distance'
      : d === 1
      ? 'adjacent'
      : `${d} rooms away`;
  return `RN${displayId} — ${distPart}, load ${projectedLoad}/${maxLoad} after admission`;
}
