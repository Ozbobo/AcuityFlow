# Charge Nurse Assigner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first React PWA that helps a charge nurse distribute patients to RNs on an L-shaped floor, balanced by workload and geographic clustering, and deploy it to GitHub Pages.

**Architecture:** Pure-logic modules (floor geometry, distribution algorithm, admission recommendation) live in `src/lib/` with zero React dependencies and are unit-tested heavily. State lives in a single React context + reducer, persisted to `localStorage`. UI is composed of thin pages that delegate to focused components, with a shared `FloorMap` renderer powering both the Census (edit) and Assignments (view) map views.

**Tech Stack:** React 18, Vite, TypeScript, react-router-dom, vite-plugin-pwa, Vitest + React Testing Library, Playwright, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-04-08-charge-nurse-assigner-design.md`

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.vscode/extensions.json` (optional)

- [ ] **Step 1.1: Initialize package.json**

Create `package.json`:

```json
{
  "name": "momsite",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 1.2: Install dependencies**

Run: `npm install`
Expected: installs cleanly, creates `node_modules/` and `package-lock.json`

- [ ] **Step 1.3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 1.4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 1.5: Create vite.config.ts**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: base path will be updated to '/<repo-name>/' in Task 19 (GitHub Pages deploy)
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 1.6: Create src/test-setup.ts**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 1.7: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
    <meta name="theme-color" content="#4a7dff" />
    <title>Charge Nurse Assigner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.8: Create src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 1.9: Create a placeholder src/App.tsx**

```tsx
export default function App() {
  return <div>Charge Nurse Assigner</div>;
}
```

- [ ] **Step 1.10: Verify the project builds and runs**

Run: `npm run build`
Expected: builds to `dist/` with no errors

Run: `npm run dev`
Expected: dev server starts on http://localhost:5173, shows "Charge Nurse Assigner"
Stop the dev server with Ctrl+C.

- [ ] **Step 1.11: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: "No test files found" — not an error, exits with status 0 or a benign exit.

- [ ] **Step 1.12: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx src/test-setup.ts
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Types and floor module (pure data)

This is the single source of truth for the 30 rooms, their positions on the floor walk, and the distance function between any two rooms.

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/floor.ts`
- Create: `tests/floor.test.ts`

- [ ] **Step 2.1: Create src/lib/types.ts**

```ts
export type Criticality = 'high' | 'medium' | 'low';
export type Hall = 'high' | 'low';

export interface Room {
  number: number;
  hall: Hall;
  position: number;    // 0..14 on the floor walk
  pairId: number;      // rooms across the hall share a pairId
  occupied: boolean;
  criticality: Criticality | null;
  assignedTo: number | null;
}

export interface RN {
  id: number;              // 0-based; displayed as RN{id+1}
  assignedRooms: number[]; // room numbers
}

export interface ShiftState {
  ratio: number;
  rnCount: number;
  rooms: Room[];
  rns: RN[];
}

export interface Suggestion {
  rnId: number;
  score: number;
  reason: string;
}

export const SCORE: Record<Criticality, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
```

- [ ] **Step 2.2: Write failing test for floor module**

Create `tests/floor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ALL_ROOMS,
  createEmptyRooms,
  distance,
  getRoom,
  positionOf,
} from '../src/lib/floor';

describe('floor', () => {
  it('has 30 rooms total', () => {
    expect(ALL_ROOMS.length).toBe(30);
  });

  it('has 16 rooms in High Hall (915-930)', () => {
    const high = ALL_ROOMS.filter((n) => n >= 915 && n <= 930);
    expect(high.length).toBe(16);
  });

  it('has 14 rooms in Low Hall (901-914)', () => {
    const low = ALL_ROOMS.filter((n) => n >= 901 && n <= 914);
    expect(low.length).toBe(14);
  });

  it('createEmptyRooms returns 30 empty rooms', () => {
    const rooms = createEmptyRooms();
    expect(rooms.length).toBe(30);
    expect(rooms.every((r) => !r.occupied)).toBe(true);
    expect(rooms.every((r) => r.criticality === null)).toBe(true);
    expect(rooms.every((r) => r.assignedTo === null)).toBe(true);
  });

  it('positions 915/916 at the station (High side)', () => {
    expect(positionOf(915)).toBe(positionOf(916));
  });

  it('positions 901/902 at the station (Low side)', () => {
    expect(positionOf(901)).toBe(positionOf(902));
  });

  it('positions 915 and 901 are adjacent (distance 1)', () => {
    expect(distance(915, 901)).toBe(1);
  });

  it('positions 929/930 are the farthest in High Hall', () => {
    expect(positionOf(929)).toBe(0);
    expect(positionOf(930)).toBe(0);
  });

  it('positions 913/914 are the farthest in Low Hall', () => {
    expect(positionOf(913)).toBe(14);
    expect(positionOf(914)).toBe(14);
  });

  it('distance is symmetric', () => {
    expect(distance(915, 920)).toBe(distance(920, 915));
    expect(distance(901, 913)).toBe(distance(913, 901));
  });

  it('distance across hall (same pair) is 0', () => {
    expect(distance(915, 916)).toBe(0);
    expect(distance(901, 902)).toBe(0);
  });

  it('distance across station (915 to 901) is 1', () => {
    expect(distance(915, 901)).toBe(1);
  });

  it('distance across station (916 to 902) is 1', () => {
    expect(distance(916, 902)).toBe(1);
  });

  it('distance 929 to 914 is the maximum (end-to-end)', () => {
    expect(distance(929, 914)).toBe(14);
  });

  it('getRoom returns the room object by number', () => {
    const rooms = createEmptyRooms();
    const r = getRoom(rooms, 915);
    expect(r?.number).toBe(915);
    expect(r?.hall).toBe('high');
  });

  it('every room has a unique number', () => {
    const rooms = createEmptyRooms();
    const nums = new Set(rooms.map((r) => r.number));
    expect(nums.size).toBe(30);
  });

  it('paired rooms share a pairId', () => {
    const rooms = createEmptyRooms();
    const r915 = getRoom(rooms, 915)!;
    const r916 = getRoom(rooms, 916)!;
    expect(r915.pairId).toBe(r916.pairId);
    const r901 = getRoom(rooms, 901)!;
    const r902 = getRoom(rooms, 902)!;
    expect(r901.pairId).toBe(r902.pairId);
    expect(r915.pairId).not.toBe(r901.pairId);
  });
});
```

- [ ] **Step 2.3: Run test, expect failure**

Run: `npm test -- tests/floor.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/floor'`

- [ ] **Step 2.4: Implement src/lib/floor.ts**

```ts
import { Room, Hall } from './types';

// Floor walk coordinate: positions 0..14.
// High Hall: 929/930 = 0 (farthest), 915/916 = 7 (at station).
// Low Hall:  901/902 = 8 (at station), 913/914 = 14 (farthest).

const HIGH_HALL_NUMBERS: number[] = [
  929, 930, 927, 928, 925, 926, 923, 924,
  921, 922, 919, 920, 917, 918, 915, 916,
];
// index 0,1 -> position 0 ; index 2,3 -> position 1 ; ... ; index 14,15 -> position 7

const LOW_HALL_NUMBERS: number[] = [
  901, 902, 903, 904, 905, 906, 907, 908,
  909, 910, 911, 912, 913, 914,
];
// index 0,1 -> position 8 ; index 2,3 -> position 9 ; ... ; index 12,13 -> position 14

function buildRooms(): Room[] {
  const rooms: Room[] = [];
  // High Hall
  for (let i = 0; i < HIGH_HALL_NUMBERS.length; i++) {
    const number = HIGH_HALL_NUMBERS[i];
    const position = Math.floor(i / 2); // 0..7
    const pairId = position;            // pair ids 0..7 for High Hall
    rooms.push({
      number,
      hall: 'high' as Hall,
      position,
      pairId,
      occupied: false,
      criticality: null,
      assignedTo: null,
    });
  }
  // Low Hall
  for (let i = 0; i < LOW_HALL_NUMBERS.length; i++) {
    const number = LOW_HALL_NUMBERS[i];
    const position = 8 + Math.floor(i / 2); // 8..14
    const pairId = 8 + Math.floor(i / 2);   // pair ids 8..14 for Low Hall
    rooms.push({
      number,
      hall: 'low' as Hall,
      position,
      pairId,
      occupied: false,
      criticality: null,
      assignedTo: null,
    });
  }
  return rooms;
}

const ROOMS_TEMPLATE: Room[] = buildRooms();
const POSITIONS: Map<number, number> = new Map(
  ROOMS_TEMPLATE.map((r) => [r.number, r.position])
);

export const ALL_ROOMS: number[] = ROOMS_TEMPLATE.map((r) => r.number);

export function createEmptyRooms(): Room[] {
  // Return a deep clone so callers can mutate freely.
  return ROOMS_TEMPLATE.map((r) => ({ ...r }));
}

export function positionOf(roomNumber: number): number {
  const p = POSITIONS.get(roomNumber);
  if (p === undefined) {
    throw new Error(`Unknown room number: ${roomNumber}`);
  }
  return p;
}

export function distance(a: number, b: number): number {
  return Math.abs(positionOf(a) - positionOf(b));
}

export function getRoom(rooms: Room[], number: number): Room | undefined {
  return rooms.find((r) => r.number === number);
}
```

- [ ] **Step 2.5: Run tests, expect pass**

Run: `npm test -- tests/floor.test.ts`
Expected: all 16 tests pass

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/types.ts src/lib/floor.ts tests/floor.test.ts
git commit -m "feat(lib): add floor module with 30 rooms, positions, distances"
```

---

## Task 3: Distribution algorithm

Implements the split-and-swap algorithm that takes occupied rooms and divides them into N contiguous zones balanced by workload score.

**Files:**
- Create: `src/lib/distribute.ts`
- Create: `tests/distribute.test.ts`

- [ ] **Step 3.1: Write failing tests**

Create `tests/distribute.test.ts`:

```ts
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
```

- [ ] **Step 3.2: Run tests, expect failure**

Run: `npm test -- tests/distribute.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3.3: Implement src/lib/distribute.ts**

```ts
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
  }));

  if (occupied.length === 0) return emptyRns;

  // Greedy partition into contiguous chunks with balanced total score.
  const chunks = partitionByScore(occupied, rnCount);

  // Boundary swap pass to improve criticality mix.
  rebalanceMix(chunks);

  // Convert to RN objects.
  return chunks.map((chunk, id) => ({
    id,
    assignedRooms: chunk.map((r) => r.number),
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
    chunks[chunkIdx].push(sorted[i]);
    runningScore += roomScore(sorted[i]);

    const remaining = sorted.length - i - 1;
    const chunksLeft = n - chunkIdx - 1;

    // Move to next chunk if we've hit the target AND there are enough rooms
    // left for the remaining chunks to each get at least one, AND we still
    // have more chunks to fill.
    if (
      chunksLeft > 0 &&
      remaining >= chunksLeft &&
      runningScore >= target &&
      chunkIdx < n - 1
    ) {
      chunkIdx++;
      runningScore = 0;
    }
  }

  return chunks;
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
```

- [ ] **Step 3.4: Run tests, expect pass**

Run: `npm test -- tests/distribute.test.ts`
Expected: all tests pass

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/distribute.ts tests/distribute.test.ts
git commit -m "feat(lib): add split-and-swap distribution algorithm"
```

---

## Task 4: Admission recommendation algorithm

Given a new patient's room and level, returns the top 3 best RNs with explanations.

**Files:**
- Create: `src/lib/recommend.ts`
- Create: `tests/recommend.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `tests/recommend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recommend } from '../src/lib/recommend';
import { createEmptyRooms, getRoom } from '../src/lib/floor';
import { ShiftState, Criticality, Room, RN } from '../src/lib/types';

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
    return { id, assignedRooms: nums };
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
});
```

- [ ] **Step 4.2: Run tests, expect failure**

Run: `npm test -- tests/recommend.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4.3: Implement src/lib/recommend.ts**

```ts
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
    (rn) => rn.assignedRooms.length < state.ratio
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
```

- [ ] **Step 4.4: Run tests, expect pass**

Run: `npm test -- tests/recommend.test.ts`
Expected: all tests pass

- [ ] **Step 4.5: Run the full test suite**

Run: `npm test`
Expected: floor, distribute, and recommend tests all pass

- [ ] **Step 4.6: Commit**

```bash
git add src/lib/recommend.ts tests/recommend.test.ts
git commit -m "feat(lib): add admission recommendation algorithm"
```

---

## Task 5: State management (context + reducer + localStorage)

**Files:**
- Create: `src/state/initialState.ts`
- Create: `src/state/storage.ts`
- Create: `src/state/ShiftContext.tsx`

- [ ] **Step 5.1: Create src/state/initialState.ts**

```ts
import { ShiftState } from '../lib/types';
import { createEmptyRooms } from '../lib/floor';

export const DEFAULT_RATIO = 4;
export const MAX_RATIO = 5;
export const MIN_RATIO = 1;

export function createInitialState(): ShiftState {
  return {
    ratio: DEFAULT_RATIO,
    rnCount: 0,
    rooms: createEmptyRooms(),
    rns: [],
  };
}
```

- [ ] **Step 5.2: Create src/state/storage.ts**

```ts
import { ShiftState } from '../lib/types';
import { createInitialState } from './initialState';

const STORAGE_KEY = 'momsite:shift';

export function loadShift(): ShiftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as ShiftState;
    // Basic validation: if the stored shape is wrong, start fresh.
    if (
      typeof parsed.ratio !== 'number' ||
      typeof parsed.rnCount !== 'number' ||
      !Array.isArray(parsed.rooms) ||
      !Array.isArray(parsed.rns)
    ) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveShift(state: ShiftState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode); fail silently.
  }
}

export function clearShift(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 5.3: Create src/state/ShiftContext.tsx**

```tsx
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { ShiftState, Criticality, RN, Room, SCORE } from '../lib/types';
import { createInitialState } from './initialState';
import { loadShift, saveShift, clearShift } from './storage';
import { distribute } from '../lib/distribute';
import { getRoom } from '../lib/floor';

type Action =
  | { type: 'SET_RATIO'; value: number }
  | { type: 'SET_RN_COUNT'; value: number }
  | { type: 'SET_CRITICALITY'; room: number; level: Criticality | null }
  | { type: 'DISTRIBUTE' }
  | { type: 'MOVE_ROOM'; room: number; toRnId: number }
  | { type: 'NEW_SHIFT' }
  | { type: 'LOAD'; state: ShiftState };

function reducer(state: ShiftState, action: Action): ShiftState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'SET_RATIO':
      return { ...state, ratio: action.value };

    case 'SET_RN_COUNT': {
      const rnCount = Math.max(0, action.value);
      const rns: RN[] = Array.from({ length: rnCount }, (_, id) => {
        const existing = state.rns.find((r) => r.id === id);
        return existing ?? { id, assignedRooms: [] };
      });
      // Clear assignments for rooms pointing at removed RNs
      const rooms = state.rooms.map((r) =>
        r.assignedTo !== null && r.assignedTo >= rnCount
          ? { ...r, assignedTo: null }
          : r
      );
      return { ...state, rnCount, rns, rooms };
    }

    case 'SET_CRITICALITY': {
      const rooms = state.rooms.map((r) => {
        if (r.number !== action.room) return r;
        if (action.level === null) {
          return { ...r, occupied: false, criticality: null, assignedTo: null };
        }
        return { ...r, occupied: true, criticality: action.level };
      });
      // If we just cleared an occupied room, strip it from any RN
      const rns = state.rns.map((rn) => ({
        ...rn,
        assignedRooms: rn.assignedRooms.filter((n) => {
          if (n !== action.room) return true;
          return action.level !== null;
        }),
      }));
      return { ...state, rooms, rns };
    }

    case 'DISTRIBUTE': {
      const rns = distribute(state.rooms, state.rnCount);
      const rooms = state.rooms.map((r) => {
        const assignedTo = rns.findIndex((rn) =>
          rn.assignedRooms.includes(r.number)
        );
        return { ...r, assignedTo: assignedTo === -1 ? null : assignedTo };
      });
      return { ...state, rns, rooms };
    }

    case 'MOVE_ROOM': {
      const rns = state.rns.map((rn) => ({
        ...rn,
        assignedRooms: rn.assignedRooms.filter((n) => n !== action.room),
      }));
      const target = rns.find((rn) => rn.id === action.toRnId);
      if (target) target.assignedRooms = [...target.assignedRooms, action.room];
      const rooms = state.rooms.map((r) =>
        r.number === action.room ? { ...r, assignedTo: action.toRnId } : r
      );
      return { ...state, rns, rooms };
    }

    case 'NEW_SHIFT':
      return createInitialState();

    default:
      return state;
  }
}

interface ShiftContextValue {
  state: ShiftState;
  dispatch: React.Dispatch<Action>;
  newShift: () => void;
}

const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadShift());

  useEffect(() => {
    saveShift(state);
  }, [state]);

  const newShift = () => {
    clearShift();
    dispatch({ type: 'NEW_SHIFT' });
  };

  return (
    <ShiftContext.Provider value={{ state, dispatch, newShift }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift(): ShiftContextValue {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used within ShiftProvider');
  return ctx;
}

// Selectors (pure helpers)
export function occupiedCount(state: ShiftState): number {
  return state.rooms.filter((r) => r.occupied).length;
}

export function criticalityCounts(state: ShiftState) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const r of state.rooms) {
    if (r.criticality) counts[r.criticality]++;
  }
  return counts;
}

export function recommendedRnCount(state: ShiftState): number {
  const n = occupiedCount(state);
  if (n === 0) return 0;
  return Math.ceil(n / state.ratio);
}

export function workloadScore(rn: RN, state: ShiftState): number {
  return rn.assignedRooms.reduce((sum, n) => {
    const r = getRoom(state.rooms, n);
    if (!r || !r.criticality) return sum;
    return sum + SCORE[r.criticality];
  }, 0);
}

export function emptyRooms(state: ShiftState): Room[] {
  return state.rooms.filter((r) => !r.occupied);
}
```

- [ ] **Step 5.4: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 5.5: Commit**

```bash
git add src/state/
git commit -m "feat(state): add shift context, reducer, and localStorage persistence"
```

---

## Task 6: Global styles and theme

**Files:**
- Create: `src/styles/global.css`
- Create: `src/styles/theme.css`

- [ ] **Step 6.1: Create src/styles/theme.css**

```css
:root {
  /* Base palette */
  --bg: #f5f5f7;
  --bg-elevated: #ffffff;
  --text: #111418;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --divider: #eceef2;

  /* Brand */
  --primary: #4a7dff;
  --primary-contrast: #ffffff;
  --danger: #dc2626;
  --danger-contrast: #ffffff;

  /* Criticality */
  --crit-high-bg: #ffe0e0;
  --crit-high-fg: #c00;
  --crit-med-bg: #fff3d6;
  --crit-med-fg: #a60;
  --crit-low-bg: #e0f3e0;
  --crit-low-fg: #060;
  --crit-empty-bg: #e8e8ed;
  --crit-empty-fg: #9aa0a6;

  /* RN colors (6 is enough; cycle after that) */
  --rn-0: #4a7dff;
  --rn-1: #9b59b6;
  --rn-2: #16a085;
  --rn-3: #e67e22;
  --rn-4: #e74c3c;
  --rn-5: #2c3e50;

  /* Layout */
  --radius: 12px;
  --radius-sm: 8px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  --bottom-nav-height: 56px;
}
```

- [ ] **Step 6.2: Create src/styles/global.css**

```css
@import './theme.css';

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#root {
  margin: 0;
  padding: 0;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: 16px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

button {
  font: inherit;
  cursor: pointer;
  background: none;
  border: none;
  color: inherit;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

h1, h2, h3, h4 {
  margin: 0;
  font-weight: 700;
}

.app-shell {
  min-height: 100vh;
  padding-bottom: calc(var(--bottom-nav-height) + var(--space-4));
}

.page {
  padding: var(--space-4);
  max-width: 640px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.card {
  background: var(--bg-elevated);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  font-weight: 700;
  min-height: 44px;
  min-width: 44px;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast);
  width: 100%;
}

.btn-danger {
  background: var(--danger);
  color: var(--danger-contrast);
}

.btn-ghost {
  background: transparent;
  color: var(--primary);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chip-high { background: var(--crit-high-bg); color: var(--crit-high-fg); }
.chip-med  { background: var(--crit-med-bg);  color: var(--crit-med-fg); }
.chip-low  { background: var(--crit-low-bg);  color: var(--crit-low-fg); }
.chip-empty { background: var(--crit-empty-bg); color: var(--crit-empty-fg); }

.label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.stepper .val {
  font-size: 24px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
}

.stepper button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  font-size: 22px;
  font-weight: 700;
}

.sticky-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--bottom-nav-height);
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  padding: var(--space-3) var(--space-4);
  display: flex;
  gap: var(--space-3);
  align-items: center;
  z-index: 5;
}

.tabs {
  display: flex;
  background: var(--divider);
  border-radius: var(--radius-sm);
  padding: 3px;
  margin-bottom: var(--space-3);
}

.tabs button {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  font-weight: 600;
  color: var(--text-muted);
}

.tabs button.active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 6.3: Import global.css in src/main.tsx**

Update `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6.4: Verify dev server still runs**

Run: `npm run dev`
Expected: loads without CSS errors. Stop with Ctrl+C.

- [ ] **Step 6.5: Commit**

```bash
git add src/styles/ src/main.tsx
git commit -m "style: add global CSS theme and base layout primitives"
```

---

## Task 7: Shared components — BottomNav, ConfirmDialog, BottomSheet

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/BottomSheet.tsx`
- Create: `src/components/BottomSheet.css`

- [ ] **Step 7.1: Create src/components/BottomNav.tsx**

```tsx
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Setup' },
  { to: '/census', label: 'Census' },
  { to: '/assignments', label: 'Assign' },
];

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 'var(--bottom-nav-height)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 20,
      }}
    >
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          })}
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 7.2: Create src/components/BottomSheet.css**

```css
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  animation: fade-in 0.15s ease-out;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-elevated);
  border-radius: 18px 18px 0 0;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-5) + env(safe-area-inset-bottom, 0));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.15);
  z-index: 101;
  animation: slide-up 0.2s ease-out;
  max-height: 80vh;
  overflow-y: auto;
}

.sheet h3 {
  margin: 0 0 var(--space-3) 0;
  font-size: 18px;
}

.sheet .grab {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--divider);
  margin: 0 auto var(--space-3);
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

- [ ] **Step 7.3: Create src/components/BottomSheet.tsx**

```tsx
import { ReactNode, useEffect } from 'react';
import './BottomSheet.css';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 7.4: Create src/components/ConfirmDialog.tsx**

```tsx
import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <BottomSheet open={open} title={title} onClose={onCancel}>
      <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-muted)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
          style={{ flex: 1 }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 7.5: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 7.6: Commit**

```bash
git add src/components/BottomNav.tsx src/components/BottomSheet.tsx src/components/BottomSheet.css src/components/ConfirmDialog.tsx
git commit -m "feat(components): add BottomNav, BottomSheet, ConfirmDialog"
```

---

## Task 8: RoomCell component

A single room cell used inside the FloorMap. Shows criticality color and an optional RN border.

**Files:**
- Create: `src/components/RoomCell.tsx`
- Create: `src/components/RoomCell.css`

- [ ] **Step 8.1: Create src/components/RoomCell.css**

```css
.room-cell {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--crit-empty-bg);
  color: var(--crit-empty-fg);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  user-select: none;
}

.room-cell.high   { background: var(--crit-high-bg); color: var(--crit-high-fg); }
.room-cell.medium { background: var(--crit-med-bg);  color: var(--crit-med-fg); }
.room-cell.low    { background: var(--crit-low-bg);  color: var(--crit-low-fg); }

.room-cell.rn-0 { box-shadow: inset 0 0 0 3px var(--rn-0); }
.room-cell.rn-1 { box-shadow: inset 0 0 0 3px var(--rn-1); }
.room-cell.rn-2 { box-shadow: inset 0 0 0 3px var(--rn-2); }
.room-cell.rn-3 { box-shadow: inset 0 0 0 3px var(--rn-3); }
.room-cell.rn-4 { box-shadow: inset 0 0 0 3px var(--rn-4); }
.room-cell.rn-5 { box-shadow: inset 0 0 0 3px var(--rn-5); }

.room-cell.highlight { outline: 3px solid var(--primary); outline-offset: 2px; }

.room-cell[role='button'] { cursor: pointer; }
```

- [ ] **Step 8.2: Create src/components/RoomCell.tsx**

```tsx
import { Room } from '../lib/types';
import './RoomCell.css';

interface Props {
  room: Room;
  onClick?: () => void;
  highlight?: boolean;
}

export default function RoomCell({ room, onClick, highlight }: Props) {
  const classes = ['room-cell'];
  if (room.criticality) classes.push(room.criticality);
  if (room.assignedTo !== null) classes.push(`rn-${room.assignedTo % 6}`);
  if (highlight) classes.push('highlight');

  return (
    <div
      className={classes.join(' ')}
      role={onClick ? 'button' : undefined}
      aria-label={`Room ${room.number}`}
      onClick={onClick}
    >
      {room.number}
    </div>
  );
}
```

- [ ] **Step 8.3: Commit**

```bash
git add src/components/RoomCell.tsx src/components/RoomCell.css
git commit -m "feat(components): add RoomCell"
```

---

## Task 9: CriticalityPicker (bottom sheet with H/M/L/Empty)

**Files:**
- Create: `src/components/CriticalityPicker.tsx`

- [ ] **Step 9.1: Create src/components/CriticalityPicker.tsx**

```tsx
import BottomSheet from './BottomSheet';
import { Criticality } from '../lib/types';

interface Props {
  open: boolean;
  roomNumber: number | null;
  current: Criticality | null;
  onPick: (level: Criticality | null) => void;
  onClose: () => void;
}

const options: { level: Criticality | null; label: string; className: string }[] = [
  { level: 'high', label: 'HIGH', className: 'chip-high' },
  { level: 'medium', label: 'MEDIUM', className: 'chip-med' },
  { level: 'low', label: 'LOW', className: 'chip-low' },
  { level: null, label: 'EMPTY', className: 'chip-empty' },
];

export default function CriticalityPicker({
  open,
  roomNumber,
  current,
  onPick,
  onClose,
}: Props) {
  return (
    <BottomSheet
      open={open}
      title={roomNumber !== null ? `Room ${roomNumber}` : 'Room'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {options.map((opt) => {
          const isCurrent = opt.level === current;
          return (
            <button
              key={opt.label}
              onClick={() => {
                onPick(opt.level);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg)',
                border: isCurrent ? '2px solid var(--primary)' : '2px solid transparent',
                minHeight: 56,
              }}
            >
              <span className={`chip ${opt.className}`}>{opt.label}</span>
              {isCurrent && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 9.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 9.3: Commit**

```bash
git add src/components/CriticalityPicker.tsx
git commit -m "feat(components): add CriticalityPicker bottom sheet"
```

---

## Task 10: FloorMap component

The L-shape renderer used in both Census (editable) and Assignments (view-only with RN badges).

**Files:**
- Create: `src/components/FloorMap.tsx`
- Create: `src/components/FloorMap.css`

- [ ] **Step 10.1: Create src/components/FloorMap.css**

```css
.floor-map {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  margin: var(--space-3) auto;
}

.floor-map .hall-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: var(--space-2) 0;
}

.floor-map .high-hall {
  display: grid;
  grid-template-columns: repeat(2, 36px);
  gap: 4px;
}

.floor-map .station-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0;
}

.floor-map .station {
  width: 76px;
  height: 76px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.2;
  padding: 4px;
}

.floor-map .low-hall {
  display: grid;
  grid-template-rows: repeat(2, 36px);
  grid-auto-flow: column;
  grid-auto-columns: 36px;
  gap: 4px;
}

.floor-map .legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-3);
  font-size: 11px;
}

.floor-map .legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.floor-map .legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
```

- [ ] **Step 10.2: Create src/components/FloorMap.tsx**

```tsx
import { Room } from '../lib/types';
import RoomCell from './RoomCell';
import './FloorMap.css';

interface Props {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
  highlightedRooms?: number[];
  showLegend?: boolean;
  rnCount?: number;
}

// Display order: for High Hall (vertical, runs up from station),
// we render from farthest-from-station (top) to closest (bottom).
// Each row is a pair: [even, odd] visually.
const HIGH_DISPLAY_ORDER: Array<[number, number]> = [
  [930, 929],
  [928, 927],
  [926, 925],
  [924, 923],
  [922, 921],
  [920, 919],
  [918, 917],
  [916, 915],
];

// Low Hall (horizontal, runs right from station):
// each column is a pair [odd on top, even on bottom].
const LOW_DISPLAY_COLUMNS: Array<[number, number]> = [
  [901, 902],
  [903, 904],
  [905, 906],
  [907, 908],
  [909, 910],
  [911, 912],
  [913, 914],
];

export default function FloorMap({
  rooms,
  onRoomClick,
  highlightedRooms = [],
  showLegend = false,
  rnCount = 0,
}: Props) {
  const byNumber = new Map(rooms.map((r) => [r.number, r]));
  const isHighlighted = (n: number) => highlightedRooms.includes(n);

  return (
    <div className="floor-map">
      <div className="hall-label">High Hall ↑</div>
      <div className="high-hall">
        {HIGH_DISPLAY_ORDER.flatMap(([left, right]) => {
          const lr = byNumber.get(left);
          const rr = byNumber.get(right);
          return [
            lr && (
              <RoomCell
                key={left}
                room={lr}
                onClick={onRoomClick ? () => onRoomClick(lr) : undefined}
                highlight={isHighlighted(left)}
              />
            ),
            rr && (
              <RoomCell
                key={right}
                room={rr}
                onClick={onRoomClick ? () => onRoomClick(rr) : undefined}
                highlight={isHighlighted(right)}
              />
            ),
          ];
        })}
      </div>

      <div className="station-row">
        <div className="station">
          NURSE
          <br />
          STATION
        </div>
        <div className="low-hall">
          {LOW_DISPLAY_COLUMNS.flatMap(([top, bottom]) => {
            const tr = byNumber.get(top);
            const br = byNumber.get(bottom);
            return [
              tr && (
                <RoomCell
                  key={top}
                  room={tr}
                  onClick={onRoomClick ? () => onRoomClick(tr) : undefined}
                  highlight={isHighlighted(top)}
                />
              ),
              br && (
                <RoomCell
                  key={bottom}
                  room={br}
                  onClick={onRoomClick ? () => onRoomClick(br) : undefined}
                  highlight={isHighlighted(bottom)}
                />
              ),
            ];
          })}
        </div>
      </div>
      <div className="hall-label">Low Hall →</div>

      {showLegend && rnCount > 0 && (
        <div className="legend">
          {Array.from({ length: rnCount }, (_, i) => (
            <span className="legend-item" key={i}>
              <span
                className="legend-swatch"
                style={{ background: `var(--rn-${i % 6})` }}
              />
              RN{i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10.3: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 10.4: Commit**

```bash
git add src/components/FloorMap.tsx src/components/FloorMap.css
git commit -m "feat(components): add L-shape FloorMap renderer"
```

---

## Task 11: RnCard component

Shows a single RN's assignments in the list view of the Assignments page.

**Files:**
- Create: `src/components/RnCard.tsx`

- [ ] **Step 11.1: Create src/components/RnCard.tsx**

```tsx
import { RN, Room, SCORE } from '../lib/types';

interface Props {
  rn: RN;
  rooms: Room[]; // all rooms, for looking up criticality
  onRoomTap?: (roomNumber: number) => void;
}

export default function RnCard({ rn, rooms, onRoomTap }: Props) {
  const byNumber = new Map(rooms.map((r) => [r.number, r]));
  const score = rn.assignedRooms.reduce((sum, n) => {
    const r = byNumber.get(n);
    return r && r.criticality ? sum + SCORE[r.criticality] : sum;
  }, 0);

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid var(--rn-${rn.id % 6})`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-2)',
        }}
      >
        <strong>RN{rn.id + 1}</strong>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {rn.assignedRooms.length} rooms · score {score}
        </span>
      </div>
      {rn.assignedRooms.length === 0 ? (
        <em style={{ color: 'var(--text-muted)', fontSize: 13 }}>No rooms assigned</em>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {rn.assignedRooms
            .slice()
            .sort((a, b) => a - b)
            .map((n) => {
              const r = byNumber.get(n);
              const chipClass = r?.criticality
                ? `chip-${r.criticality === 'medium' ? 'med' : r.criticality}`
                : 'chip-empty';
              return (
                <button
                  key={n}
                  onClick={onRoomTap ? () => onRoomTap(n) : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {n}
                  <span className={`chip ${chipClass}`}>
                    {r?.criticality ? r.criticality[0].toUpperCase() : 'E'}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/components/RnCard.tsx
git commit -m "feat(components): add RnCard for Assignments list view"
```

---

## Task 12: Setup page

**Files:**
- Create: `src/pages/Setup.tsx`

- [ ] **Step 12.1: Create src/pages/Setup.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useShift,
  occupiedCount,
  criticalityCounts,
  recommendedRnCount,
} from '../state/ShiftContext';
import { MIN_RATIO, MAX_RATIO } from '../state/initialState';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Setup() {
  const { state, dispatch, newShift } = useShift();
  const navigate = useNavigate();
  const [confirmNew, setConfirmNew] = useState(false);

  const total = occupiedCount(state);
  const counts = criticalityCounts(state);
  const recommended = recommendedRnCount(state);

  const canDistribute = total > 0 && state.rnCount > 0;
  const underStaffed = state.rnCount > 0 && state.rnCount < recommended;

  return (
    <>
      <header className="page-header">
        <h2>Shift Setup</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/about')}>
            About
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmNew(true)}>
            New Shift
          </button>
        </div>
      </header>

      <main className="page">
        <div className="card">
          <div className="label">Ratio (patients per RN)</div>
          <div className="stepper" style={{ marginTop: 'var(--space-2)' }}>
            <button
              onClick={() =>
                dispatch({ type: 'SET_RATIO', value: Math.max(MIN_RATIO, state.ratio - 1) })
              }
              aria-label="Decrease ratio"
            >
              −
            </button>
            <div className="val">{state.ratio}</div>
            <button
              onClick={() =>
                dispatch({ type: 'SET_RATIO', value: Math.min(MAX_RATIO, state.ratio + 1) })
              }
              aria-label="Increase ratio"
            >
              +
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              max {MAX_RATIO}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="label">Available RNs</div>
          <div className="stepper" style={{ marginTop: 'var(--space-2)' }}>
            <button
              onClick={() =>
                dispatch({ type: 'SET_RN_COUNT', value: Math.max(0, state.rnCount - 1) })
              }
              aria-label="Decrease RN count"
            >
              −
            </button>
            <div className="val">{state.rnCount}</div>
            <button
              onClick={() => dispatch({ type: 'SET_RN_COUNT', value: state.rnCount + 1 })}
              aria-label="Increase RN count"
            >
              +
            </button>
          </div>
          {recommended > 0 && (
            <div
              style={{
                fontSize: 12,
                color: underStaffed ? 'var(--danger)' : 'var(--primary)',
                marginTop: 'var(--space-2)',
              }}
            >
              Recommended: {recommended} ({total} patients ÷ ratio {state.ratio})
              {underStaffed && ' — under-staffed'}
            </div>
          )}
        </div>

        <div className="card" style={{ background: '#eef5ff' }}>
          <div className="label">Census</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: 'var(--space-1) 0' }}>
            {total} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>patients</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className="chip chip-high">{counts.high} HIGH</span>
            <span className="chip chip-med">{counts.medium} MED</span>
            <span className="chip chip-low">{counts.low} LOW</span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={!canDistribute}
          onClick={() => {
            dispatch({ type: 'DISTRIBUTE' });
            navigate('/assignments');
          }}
        >
          Distribute →
        </button>

        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 'var(--space-3)' }}
          onClick={() => navigate('/census')}
        >
          Edit Census →
        </button>
      </main>

      <ConfirmDialog
        open={confirmNew}
        title="New Shift"
        message="This will clear all patients and assignments. Continue?"
        confirmLabel="Clear"
        destructive
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          newShift();
          setConfirmNew(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 12.2: Commit**

```bash
git add src/pages/Setup.tsx
git commit -m "feat(pages): add Setup page with ratio, RN count, and distribute"
```

---

## Task 13: Census page

**Files:**
- Create: `src/pages/Census.tsx`

- [ ] **Step 13.1: Create src/pages/Census.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift, occupiedCount } from '../state/ShiftContext';
import { Criticality, Room } from '../lib/types';
import FloorMap from '../components/FloorMap';
import CriticalityPicker from '../components/CriticalityPicker';

type Tab = 'list' | 'map';

export default function Census() {
  const { state, dispatch } = useShift();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('list');
  const [picking, setPicking] = useState<Room | null>(null);

  const highHall = state.rooms.filter((r) => r.hall === 'high').sort((a, b) => a.number - b.number);
  const lowHall = state.rooms.filter((r) => r.hall === 'low').sort((a, b) => a.number - b.number);

  const total = occupiedCount(state);

  const setLevel = (room: Room, level: Criticality | null) => {
    dispatch({ type: 'SET_CRITICALITY', room: room.number, level });
  };

  return (
    <>
      <header className="page-header">
        <h2>Census</h2>
      </header>
      <main className="page">
        <div className="tabs">
          <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
            List
          </button>
          <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
            Map
          </button>
        </div>

        {tab === 'list' ? (
          <>
            <HallList title="High Hall" rooms={highHall} onTap={setPicking} />
            <HallList title="Low Hall" rooms={lowHall} onTap={setPicking} />
          </>
        ) : (
          <FloorMap rooms={state.rooms} onRoomClick={setPicking} />
        )}

        <div style={{ height: 80 }} />
      </main>

      <div className="sticky-footer">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{total} occupied</div>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', width: 'auto', padding: '12px 20px' }}
          disabled={total === 0 || state.rnCount === 0}
          onClick={() => {
            dispatch({ type: 'DISTRIBUTE' });
            navigate('/assignments');
          }}
        >
          Distribute →
        </button>
      </div>

      <CriticalityPicker
        open={picking !== null}
        roomNumber={picking?.number ?? null}
        current={picking?.criticality ?? null}
        onClose={() => setPicking(null)}
        onPick={(level) => {
          if (picking) setLevel(picking, level);
        }}
      />
    </>
  );
}

function HallList({
  title,
  rooms,
  onTap,
}: {
  title: string;
  rooms: Room[];
  onTap: (room: Room) => void;
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-2)' }}>
      <div className="label" style={{ padding: 'var(--space-2)' }}>{title}</div>
      {rooms.map((r) => (
        <button
          key={r.number}
          onClick={() => onTap(r)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <strong>{r.number}</strong>
          {r.criticality ? (
            <span
              className={`chip chip-${r.criticality === 'medium' ? 'med' : r.criticality}`}
            >
              {r.criticality}
            </span>
          ) : (
            <span className="chip chip-empty">EMPTY</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 13.2: Commit**

```bash
git add src/pages/Census.tsx
git commit -m "feat(pages): add Census page with list and map editor"
```

---

## Task 14: Assignments page

**Files:**
- Create: `src/pages/Assignments.tsx`

- [ ] **Step 14.1: Create src/pages/Assignments.tsx**

```tsx
import { useState } from 'react';
import { useShift, workloadScore } from '../state/ShiftContext';
import FloorMap from '../components/FloorMap';
import RnCard from '../components/RnCard';
import BottomSheet from '../components/BottomSheet';
import AdmissionModal from '../components/AdmissionModal';

type Tab = 'list' | 'map';

export default function Assignments() {
  const { state, dispatch } = useShift();
  const [tab, setTab] = useState<Tab>('list');
  const [movingRoom, setMovingRoom] = useState<number | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);

  const hasAssignments = state.rns.some((rn) => rn.assignedRooms.length > 0);

  return (
    <>
      <header className="page-header">
        <h2>Assignments</h2>
        <button className="btn btn-ghost" onClick={() => setAdmissionOpen(true)}>
          + Admission
        </button>
      </header>

      <main className="page">
        <div className="tabs">
          <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
            List
          </button>
          <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
            Map
          </button>
        </div>

        {!hasAssignments ? (
          <div className="card">
            <p style={{ color: 'var(--text-muted)' }}>
              No assignments yet. Go to Setup or Census and tap Distribute.
            </p>
          </div>
        ) : tab === 'list' ? (
          state.rns.map((rn) => (
            <RnCard
              key={rn.id}
              rn={rn}
              rooms={state.rooms}
              onRoomTap={(n) => setMovingRoom(n)}
            />
          ))
        ) : (
          <FloorMap
            rooms={state.rooms}
            showLegend
            rnCount={state.rnCount}
          />
        )}

        <div style={{ height: 80 }} />
      </main>

      <div className="sticky-footer">
        <button
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'DISTRIBUTE' })}
        >
          Re-distribute
        </button>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', width: 'auto', padding: '12px 20px' }}
          onClick={() => setAdmissionOpen(true)}
        >
          + Admission
        </button>
      </div>

      {/* Move room sheet */}
      <BottomSheet
        open={movingRoom !== null}
        title={movingRoom !== null ? `Move Room ${movingRoom} to…` : 'Move'}
        onClose={() => setMovingRoom(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {state.rns.map((rn) => {
            const score = workloadScore(rn, state);
            const already = movingRoom !== null && rn.assignedRooms.includes(movingRoom);
            return (
              <button
                key={rn.id}
                disabled={already}
                onClick={() => {
                  if (movingRoom !== null) {
                    dispatch({ type: 'MOVE_ROOM', room: movingRoom, toRnId: rn.id });
                  }
                  setMovingRoom(null);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  borderLeft: `4px solid var(--rn-${rn.id % 6})`,
                  opacity: already ? 0.4 : 1,
                }}
              >
                <strong>RN{rn.id + 1}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {rn.assignedRooms.length} rooms · score {score}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <AdmissionModal
        open={admissionOpen}
        onClose={() => setAdmissionOpen(false)}
      />
    </>
  );
}
```

- [ ] **Step 14.2: Commit**

```bash
git add src/pages/Assignments.tsx
git commit -m "feat(pages): add Assignments page with list, map, move, and re-distribute"
```

---

## Task 15: AdmissionModal

**Files:**
- Create: `src/components/AdmissionModal.tsx`

- [ ] **Step 15.1: Create src/components/AdmissionModal.tsx**

```tsx
import { useState, useMemo } from 'react';
import { useShift, emptyRooms } from '../state/ShiftContext';
import { Criticality, Suggestion } from '../lib/types';
import { recommend } from '../lib/recommend';
import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdmissionModal({ open, onClose }: Props) {
  const { state, dispatch } = useShift();
  const [roomNumber, setRoomNumber] = useState<number | null>(null);
  const [level, setLevel] = useState<Criticality | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const empties = useMemo(() => emptyRooms(state), [state]);

  const reset = () => {
    setRoomNumber(null);
    setLevel(null);
    setSuggestions(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const findBest = () => {
    if (roomNumber === null || level === null) return;
    const result = recommend(roomNumber, level, state);
    setSuggestions(result);
  };

  const assign = (rnId: number) => {
    if (roomNumber === null || level === null) return;
    dispatch({ type: 'SET_CRITICALITY', room: roomNumber, level });
    dispatch({ type: 'MOVE_ROOM', room: roomNumber, toRnId: rnId });
    close();
  };

  return (
    <BottomSheet open={open} title="New Admission" onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
            Room (empty rooms only)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-2)',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          >
            {empties.length === 0 && (
              <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)' }}>
                No empty rooms.
              </div>
            )}
            {empties.map((r) => (
              <button
                key={r.number}
                onClick={() => setRoomNumber(r.number)}
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  background: roomNumber === r.number ? 'var(--primary)' : 'var(--bg)',
                  color: roomNumber === r.number ? 'var(--primary-contrast)' : 'inherit',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                }}
              >
                {r.number}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Criticality</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['high', 'medium', 'low'] as Criticality[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  border:
                    level === l ? '2px solid var(--primary)' : '2px solid transparent',
                  background:
                    l === 'high'
                      ? 'var(--crit-high-bg)'
                      : l === 'medium'
                      ? 'var(--crit-med-bg)'
                      : 'var(--crit-low-bg)',
                  color:
                    l === 'high'
                      ? 'var(--crit-high-fg)'
                      : l === 'medium'
                      ? 'var(--crit-med-fg)'
                      : 'var(--crit-low-fg)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={roomNumber === null || level === null}
          onClick={findBest}
        >
          Find best RN
        </button>

        {suggestions !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="label">Suggestions</div>
            {suggestions.length === 0 && (
              <div style={{ color: 'var(--danger)', fontSize: 13 }}>
                All RNs at capacity. Consider increasing ratio or adding an RN.
              </div>
            )}
            {suggestions.map((s) => (
              <button
                key={s.rnId}
                onClick={() => assign(s.rnId)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  borderLeft: `4px solid var(--rn-${s.rnId % 6})`,
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.reason}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 15.2: Commit**

```bash
git add src/components/AdmissionModal.tsx
git commit -m "feat(components): add AdmissionModal with top-3 suggestions"
```

---

## Task 16: About page

**Files:**
- Create: `src/pages/About.tsx`

- [ ] **Step 16.1: Create src/pages/About.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift } from '../state/ShiftContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function About() {
  const { newShift } = useShift();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <header className="page-header">
        <h2>About</h2>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </header>
      <main className="page">
        <div className="card">
          <div className="label">Version</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Charge Nurse Assigner 0.1.0</div>
        </div>
        <div className="card">
          <div className="label">How the math works</div>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            High patients count as 3, medium as 2, and low as 1. The app splits the floor into
            contiguous zones where each RN has a similar total score. When you add an admission,
            the top 3 RNs are the ones that are nearest to the new room, have the lightest load,
            and keep the criticality mix balanced — while staying under the ratio cap.
          </p>
        </div>
        <button
          className="btn btn-danger"
          style={{ width: '100%' }}
          onClick={() => setConfirm(true)}
        >
          Clear all data
        </button>
      </main>

      <ConfirmDialog
        open={confirm}
        title="Clear all data"
        message="This wipes every patient, RN, and assignment. Continue?"
        confirmLabel="Clear"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          newShift();
          setConfirm(false);
          navigate('/');
        }}
      />
    </>
  );
}
```

- [ ] **Step 16.2: Commit**

```bash
git add src/pages/About.tsx
git commit -m "feat(pages): add About page with clear-all action"
```

---

## Task 17: App shell — routing and provider integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 17.1: Replace src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShiftProvider } from './state/ShiftContext';
import BottomNav from './components/BottomNav';
import Setup from './pages/Setup';
import Census from './pages/Census';
import Assignments from './pages/Assignments';
import About from './pages/About';

export default function App() {
  return (
    <ShiftProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<Setup />} />
            <Route path="/census" element={<Census />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ShiftProvider>
  );
}
```

- [ ] **Step 17.2: Start dev server and smoke-test manually**

Run: `npm run dev`
Expected: app loads. Walk through:
- Setup screen shows ratio=4, RNs=0
- Bump RNs to 3
- Navigate to Census, tap a few rooms, set criticalities, confirm they appear
- Navigate to Assignments — "No assignments yet" message
- Go back to Setup, tap Distribute, verify it routes to Assignments with RN cards populated
- Tap Map tab, verify the L-shape renders with RN-colored borders
- Tap + Admission, pick an empty room and a level, tap "Find best RN," verify suggestions appear
- Tap a suggestion, verify the room is assigned and shows up in that RN's card
- Tap a room chip, open the Move sheet, move it to another RN, verify it moved
- Tap New Shift, confirm, verify everything clears

Stop the dev server with Ctrl+C.

- [ ] **Step 17.3: Run all tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 17.4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up routing, provider, and bottom nav"
```

---

## Task 18: PWA configuration (manifest, service worker, icons)

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icon-192.png` (via placeholder generator)
- Create: `public/icon-512.png` (via placeholder generator)
- Create: `public/robots.txt`

- [ ] **Step 18.1: Update vite.config.ts to include vite-plugin-pwa**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// NOTE: base path will be updated to '/<repo-name>/' in Task 19
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'robots.txt'],
      manifest: {
        name: 'Charge Nurse Assigner',
        short_name: 'Assigner',
        description: 'Balanced patient distribution for charge nurses',
        theme_color: '#4a7dff',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 18.2: Create public/robots.txt**

```
User-agent: *
Allow: /
```

- [ ] **Step 18.3: Generate placeholder icons**

Create a short Node script `scripts/gen-icons.mjs`:

```js
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { createCanvas } from '@napi-rs/canvas';

// If @napi-rs/canvas isn't installed, fall back to a pre-built PNG approach
// by writing a minimal blue square PNG using a well-known 1x1 encoded buffer
// scaled by the browser via the manifest. For now, write a simple SVG we
// rasterize via a tiny helper.

function makeIcon(size, outPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a7dff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.floor(size * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CN', size / 2, size / 2);
  const buf = canvas.toBuffer('image/png');
  writeFileSync(outPath, buf);
}

if (!existsSync('public')) mkdirSync('public');
makeIcon(192, 'public/icon-192.png');
makeIcon(512, 'public/icon-512.png');
console.log('Icons generated.');
```

Install the canvas dependency:

Run: `npm install --save-dev @napi-rs/canvas`
Expected: installs

Run the generator:

Run: `node scripts/gen-icons.mjs`
Expected: creates `public/icon-192.png` and `public/icon-512.png`

**If `@napi-rs/canvas` fails to install** (common on unusual platforms), use this fallback approach instead:

Skip the script. Create each icon manually with any tool (e.g., https://favicon.io/ — type "CN", pick a blue background, download). Save them as `public/icon-192.png` and `public/icon-512.png`. The icons don't need to be pretty for v1 — they just need to exist so the PWA manifest is valid.

- [ ] **Step 18.4: Verify build succeeds with PWA plugin**

Run: `npm run build`
Expected: builds successfully, `dist/` now contains `sw.js`, `manifest.webmanifest`, and copied icons.

- [ ] **Step 18.5: Commit**

```bash
git add vite.config.ts public/robots.txt public/icon-192.png public/icon-512.png scripts/gen-icons.mjs package.json package-lock.json
git commit -m "feat(pwa): add service worker, manifest, and icons"
```

---

## Task 19: GitHub Pages deploy workflow and base path

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `vite.config.ts` (update `base`)

- [ ] **Step 19.1: Decide the repo name**

The deploy URL will be `https://<user>.github.io/<repo-name>/`. Note the repo name — it will be used both as the `base` path in Vite and in the deploy workflow.

Replace `<repo-name>` with the actual repo name in the next step. For this plan, we use the placeholder `momsite`.

- [ ] **Step 19.2: Update vite.config.ts base path**

In `vite.config.ts`, change:

```ts
base: '/',
```

to:

```ts
base: '/momsite/',
```

(Replace `momsite` with the actual repo name. If you plan to use a custom domain or deploy at the root of a `<user>.github.io` repo, leave it as `'/'`.)

- [ ] **Step 19.3: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 19.4: Verify the build still succeeds locally with new base**

Run: `npm run build`
Expected: builds successfully. Check that asset paths in `dist/index.html` are prefixed with `/momsite/` (or whatever base you chose).

- [ ] **Step 19.5: Commit**

```bash
git add .github/workflows/deploy.yml vite.config.ts
git commit -m "chore(deploy): add GitHub Pages workflow and set base path"
```

- [ ] **Step 19.6: Post-commit manual steps (not automated)**

These steps happen outside the repo once the user is ready to deploy:

1. Create a new public repo on GitHub (name it to match the `base` path — e.g., `momsite`)
2. Run `git remote add origin https://github.com/<user>/<repo>.git`
3. Run `git push -u origin main`
4. On GitHub, open the repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**
5. Wait for the workflow run to finish (1–2 minutes)
6. Open `https://<user>.github.io/<repo>/` in Samsung Chrome on the phone
7. Tap the ⋮ menu → **Add to Home Screen**

These aren't part of the plan's automated steps — flag them for the user when implementation is done.

---

## Task 20: E2E smoke test (Playwright)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 20.1: Install Playwright browsers**

Run: `npx playwright install --with-deps chromium`
Expected: downloads Chromium for Playwright

- [ ] **Step 20.2: Create playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

- [ ] **Step 20.3: Create tests/e2e/smoke.spec.ts**

```ts
import { test, expect } from '@playwright/test';

test('happy path: set up, distribute, admission, new shift', async ({ page }) => {
  await page.goto('/');

  // Set RN count to 3
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();
  await expect(rnCard.locator('.val')).toHaveText('3');

  // Go to Census, set a few rooms
  await page.getByRole('link', { name: 'Census' }).click();
  await expect(page.getByRole('heading', { name: 'Census' })).toBeVisible();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();

  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /^919/ }).click();
  await page.getByRole('dialog').getByText('LOW').first().click();

  // Distribute from the Census footer
  await page.getByRole('button', { name: /Distribute/ }).click();

  // Assignments page should load
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();
  // At least one RN card should show rooms
  await expect(page.getByText(/rooms · score/).first()).toBeVisible();

  // Open admission modal
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick an empty room and a level (921 should be empty)
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'MEDIUM' }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /RN\d/ }).first();
  await expect(firstSuggestion).toBeVisible();
  await firstSuggestion.click();

  // Room 921 should now appear somewhere in the Assignments page
  await expect(page.getByText('921')).toBeVisible();

  // New Shift flow (go to Setup)
  await page.getByRole('link', { name: 'Setup' }).click();
  await page.getByRole('button', { name: 'New Shift' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();

  // After new shift, RN count should be 0
  const rnCardAfter = page.locator('.card').filter({ hasText: 'Available RNs' });
  await expect(rnCardAfter.locator('.val')).toHaveText('0');
});
```

- [ ] **Step 20.4: Run the E2E test**

Run: `npm run test:e2e`
Expected: the test passes (may take 30–60 seconds on first run due to build + browser startup)

- [ ] **Step 20.5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test(e2e): add Playwright smoke test for happy path"
```

---

## Task 21: README

**Files:**
- Create: `README.md`

- [ ] **Step 21.1: Create README.md**

```markdown
# Charge Nurse Assigner

A mobile PWA that helps a charge nurse distribute patients to RNs on an L-shaped
floor. Assignments are balanced by workload (H/M/L criticality) and kept
geographically contiguous to minimize walking.

## Features

- Tap-to-edit census with list and L-shape map views
- Auto-distribute patients into contiguous zones balanced by workload score
- Manual room moves between RNs
- Admission flow with top-3 RN recommendations (distance + workload + mix)
- Fully offline PWA — works on a phone home screen like a native app
- No accounts, no backend, no patient data stored

## Tech

React 18, Vite, TypeScript, react-router-dom, vite-plugin-pwa, Vitest,
Playwright. Deployed to GitHub Pages via GitHub Actions.

## Running locally

```bash
npm install
npm run dev    # http://localhost:5173
npm test       # unit tests
npm run test:e2e  # end-to-end smoke test
npm run build  # production build to dist/
```

## Deploy

Push to `main` — the GitHub Actions workflow at `.github/workflows/deploy.yml`
runs tests, builds, and publishes to GitHub Pages. The live URL is
`https://<user>.github.io/<repo-name>/`.

The `base` path in `vite.config.ts` must match the repo name for assets to
resolve correctly.

## Documentation

- Design spec: `docs/superpowers/specs/2026-04-08-charge-nurse-assigner-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-08-charge-nurse-assigner.md`
```

- [ ] **Step 21.2: Final full test run**

Run: `npm test`
Expected: all unit tests pass

Run: `npm run lint`
Expected: no type errors

Run: `npm run build`
Expected: production build succeeds

- [ ] **Step 21.3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Done

At this point:

- All unit tests pass (`floor`, `distribute`, `recommend`)
- E2E smoke test passes
- Production build succeeds
- App works on a local dev server
- Repo is ready to push to GitHub and deploy to Pages

The final manual steps (from Task 19 Step 19.6) are: create the GitHub repo, push, enable Pages, and install to phone home screen.
