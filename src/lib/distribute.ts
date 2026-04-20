import { Room, RN, SCORE } from './types';

/**
 * Distribute occupied rooms among N RNs such that each gets a
 * physically contiguous zone with a roughly balanced workload score
 * and criticality mix.
 *
 * Step 1: sort occupied rooms by floor-walk position
 * Step 2: greedy partition into N contiguous chunks balanced by score
 * Step 3: boundary swaps to improve criticality mix without hurting score balance
 */
export function distribute(rooms: Room[], rnCount: number): RN[] {
  if (rnCount <= 0) return [];

  const occupied = rooms
    .filter((r) => r.occupied && r.criticality !== null)
    .sort((a, b) => a.position - b.position || a.number - b.number);

  const emptyRns: RN[] = Array.from({ length: rnCount }, (_, id) => ({
    id,
    assignedRooms: [],
    locked: false,
  }));

  if (occupied.length === 0) return emptyRns;

  // Greedy partition into contiguous chunks with balanced total score.
  const chunks = partitionByScore(occupied, rnCount);

  // Score rebalance: shift boundary rooms to reduce score spread.
  rebalanceScore(chunks);

  // Boundary swap pass to improve criticality mix.
  rebalanceMix(chunks);

  // Final pass: spread high-acuity rooms so no RN has 2+ highs while
  // another RN has 0, unless contiguity makes it unavoidable.
  rebalanceHighs(chunks);

  // Convert to RN objects.
  return chunks.map((chunk, id) => ({
    id,
    assignedRooms: chunk.map((r) => r.number),
    locked: false,
  }));
}

function roomScore(r: Room): number {
  return r.criticality ? SCORE[r.criticality] : 0;
}

function chunkScore(chunk: Room[]): number {
  return chunk.reduce((sum, r) => sum + roomScore(r), 0);
}

function partitionByScore(sorted: Room[], n: number): Room[][] {
  const chunks: Room[][] = Array.from({ length: n }, () => []);
  if (sorted.length === 0) return chunks;

  const totalScore = sorted.reduce((sum, r) => sum + roomScore(r), 0);
  const target = totalScore / n;

  let chunkIdx = 0;
  let runningScore = 0;

  for (let i = 0; i < sorted.length; i++) {
    const remaining = sorted.length - i; // rooms not yet placed (including this one)
    const chunksLeft = n - chunkIdx - 1;

    // Before adding this room: if adding it would overshoot the target, and
    // the current chunk already has at least 1 room, and there's at least 1
    // room left for each remaining chunk, advance now.
    if (
      chunksLeft > 0 &&
      chunks[chunkIdx].length > 0 &&
      remaining > chunksLeft &&
      runningScore + roomScore(sorted[i]) > target &&
      runningScore < runningScore + roomScore(sorted[i])
    ) {
      // Accept the advance only if stopping here is closer to target than
      // including this room.
      const withRoom = runningScore + roomScore(sorted[i]);
      const diffWith = Math.abs(withRoom - target);
      const diffWithout = Math.abs(runningScore - target);
      if (diffWithout <= diffWith) {
        chunkIdx++;
        runningScore = 0;
      }
    }

    chunks[chunkIdx].push(sorted[i]);
    runningScore += roomScore(sorted[i]);

    const remainingAfter = sorted.length - i - 1;
    const chunksLeftAfter = n - chunkIdx - 1;

    // Post-add advance: if we've reached or passed target and there are rooms
    // for remaining chunks.
    if (
      chunksLeftAfter > 0 &&
      remainingAfter >= 1 &&
      runningScore >= target
    ) {
      chunkIdx++;
      runningScore = 0;
    }
  }

  return chunks;
}

/**
 * Shift boundary rooms between adjacent non-empty chunks to reduce score spread.
 * Works by moving the last room of the higher-scored chunk to the lower-scored
 * neighbor (or vice versa) if that reduces the absolute score difference.
 * Runs up to 5 passes until no improvement is found.
 */
function rebalanceScore(chunks: Room[][]): void {
  for (let pass = 0; pass < 5; pass++) {
    let improved = false;
    for (let i = 0; i < chunks.length - 1; i++) {
      const left = chunks[i];
      const right = chunks[i + 1];
      if (left.length === 0 || right.length === 0) continue;

      const lScore = chunkScore(left);
      const rScore = chunkScore(right);
      const beforeDiff = Math.abs(lScore - rScore);

      if (lScore > rScore && left.length > 1) {
        // Try moving left's last room to right's front.
        const room = left[left.length - 1];
        const newLScore = lScore - roomScore(room);
        const newRScore = rScore + roomScore(room);
        if (Math.abs(newLScore - newRScore) < beforeDiff) {
          left.pop();
          right.unshift(room);
          improved = true;
          continue;
        }
      }
      if (rScore > lScore && right.length > 1) {
        // Try moving right's first room to left's end.
        const room = right[0];
        const newLScore = lScore + roomScore(room);
        const newRScore = rScore - roomScore(room);
        if (Math.abs(newLScore - newRScore) < beforeDiff) {
          right.shift();
          left.push(room);
          improved = true;
        }
      }
    }
    if (!improved) return;
  }
}

function rebalanceMix(chunks: Room[][]): void {
  // Up to 3 passes of boundary swaps between neighboring chunks.
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (let i = 0; i < chunks.length - 1; i++) {
      if (chunks[i].length === 0 || chunks[i + 1].length === 0) continue;
      const leftBoundary = chunks[i].length - 1;
      const rightBoundary = 0;
      const leftRoom = chunks[i][leftBoundary];
      const rightRoom = chunks[i + 1][rightBoundary];

      const beforeMix = mixPenalty(chunks[i]) + mixPenalty(chunks[i + 1]);
      const beforeScoreDiff = Math.abs(
        chunkScore(chunks[i]) - chunkScore(chunks[i + 1])
      );

      // Try the swap
      chunks[i][leftBoundary] = rightRoom;
      chunks[i + 1][rightBoundary] = leftRoom;

      const afterMix = mixPenalty(chunks[i]) + mixPenalty(chunks[i + 1]);
      const afterScoreDiff = Math.abs(
        chunkScore(chunks[i]) - chunkScore(chunks[i + 1])
      );

      // Accept only if mix improves and score balance doesn't worsen by more than 1.
      if (afterMix < beforeMix && afterScoreDiff <= beforeScoreDiff + 1) {
        improved = true;
      } else {
        // Revert
        chunks[i][leftBoundary] = leftRoom;
        chunks[i + 1][rightBoundary] = rightRoom;
      }
    }
    if (!improved) return;
  }
}

function highCountOf(chunk: Room[]): number {
  let n = 0;
  for (const r of chunk) if (r.criticality === 'high') n++;
  return n;
}

/**
 * Boundary-swap pass to spread high-acuity rooms across chunks.
 * Violation: some chunk has ≥2 highs while another has 0. Tries swaps
 * between adjacent chunks to move a high out of an over-loaded chunk
 * and a non-high in. Contiguity is preserved because we only touch
 * boundary rooms.
 */
function rebalanceHighs(chunks: Room[][]): void {
  for (let pass = 0; pass < 5; pass++) {
    const highs = chunks.map(highCountOf);
    const maxH = Math.max(...highs);
    const minH = Math.min(...highs);
    if (!(maxH >= 2 && minH === 0)) return;

    let improved = false;
    for (let i = 0; i < chunks.length - 1; i++) {
      const left = chunks[i];
      const right = chunks[i + 1];
      if (left.length === 0 || right.length === 0) continue;
      const leftIdx = left.length - 1;
      const rightIdx = 0;
      const leftRoom = left[leftIdx];
      const rightRoom = right[rightIdx];

      const lH = highCountOf(left);
      const rH = highCountOf(right);

      // Left over-loaded, right under-loaded: swap left-boundary high for
      // right-boundary non-high.
      if (lH >= 2 && rH === 0 && leftRoom.criticality === 'high' && rightRoom.criticality !== 'high') {
        left[leftIdx] = rightRoom;
        right[rightIdx] = leftRoom;
        improved = true;
        continue;
      }
      // Mirror: right over-loaded, left under-loaded.
      if (rH >= 2 && lH === 0 && rightRoom.criticality === 'high' && leftRoom.criticality !== 'high') {
        left[leftIdx] = rightRoom;
        right[rightIdx] = leftRoom;
        improved = true;
      }
    }
    if (!improved) return;
  }
}

// Quantifies how lopsided a chunk's criticality distribution is.
// Returns 0 for a perfectly balanced chunk; larger numbers mean more lopsided.
export function mixPenalty(chunk: Room[]): number {
  if (chunk.length === 0) return 0;
  const counts = { high: 0, medium: 0, low: 0 };
  for (const r of chunk) {
    if (r.criticality) counts[r.criticality]++;
  }
  const vals = [counts.high, counts.medium, counts.low];
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  return max - min;
}
