# Charge Nurse Assigner — Design Spec

**Date:** 2026-04-08
**Status:** Approved design, pending implementation plan

## 1. Purpose

A mobile-first Progressive Web App that helps a charge nurse assign patients to RNs
at the start of a shift and manage admissions during the shift. The app balances two
constraints simultaneously:

1. **Workload fairness** — RNs get a balanced mix of high/medium/low criticality
   patients and roughly equal total workload scores.
2. **Geographic clustering** — each RN's assigned rooms are physically contiguous on
   the floor, minimizing walking distance.

The app is for personal use by one charge nurse on her Samsung phone. No accounts,
no backend, no cloud — everything runs locally.

## 2. Privacy and Identifiers

The app never stores real patient or nurse information. Rooms are identified by their
fixed numbers (915–930, 901–914). RNs are identified by position (RN1, RN2, ...) only.
Room numbers are location data, not patient data, and are safe to persist locally.

## 3. Floor Layout

The unit is a physical L-shaped floor with the nurse station at the inside corner
(the elbow). Two halls extend from the station at a right angle:

- **High Hall** — 16 rooms, numbered 915–930. Extends vertically from the station.
  Rooms 915/916 are closest to the station (across from each other), 929/930 are
  farthest.
- **Low Hall** — 14 rooms, numbered 901–914. Extends horizontally from the station.
  Rooms 901/902 are closest to the station, 913/914 are farthest.

Odd/even pairs are across the hall from each other. The floor has 30 rooms total.

### 3.1 Room positions (floor-walk coordinate)

Rooms are assigned a 1-D position on a "floor walk" going from the far end of High
Hall, through the station, and out Low Hall:

- Position 0 → rooms 929/930 (farthest in High Hall)
- Position 7 → rooms 915/916 (at the station, High side)
- Position 8 → rooms 901/902 (at the station, Low side)
- Position 14 → rooms 913/914 (farthest in Low Hall)

Rooms at the same position share a pair (odd/even across the hall) and are treated
as adjacent. `distance(roomA, roomB)` is the absolute difference of their positions.
Crossing the station has a distance of 1 (position 7 to position 8).

### 3.2 Static floor

The 30 rooms are a constant baked into the app. The user never adds or removes rooms;
she only toggles their occupancy and criticality. This keeps the floor map layout
reliable and simplifies everything.

## 4. User Flow

1. **Start shift** — open the app. On first launch, state starts blank. If the app
   was closed mid-shift (phone locked, browser backgrounded, etc.) it resumes from
   `localStorage`. The "New Shift" action is what explicitly clears state.
2. **Set ratio and RN count** — on the Setup screen. Ratio defaults to 4, max 5.
   Available RNs default to the recommended count (derived from census ÷ ratio).
3. **Enter census** — on the Census screen, tap each occupied room to set its
   criticality (High / Medium / Low / Empty). Empty rooms are the default.
4. **Distribute** — tap Distribute. The app computes contiguous zones for each RN
   balanced by workload score and criticality mix.
5. **Review assignments** — on the Assignments screen, see each RN's rooms in list
   view or spatial map view. Tap a room chip to move it manually if needed.
6. **Handle admissions** — when a new patient arrives, tap "+ Admission," pick the
   empty room and criticality level, and get the top 3 RN suggestions. Tap one to
   assign.
7. **New Shift** — when the shift ends, tap "New Shift" and confirm. Everything wipes.

## 5. Data Model

All state lives in a single React context backed by a reducer. Persistence is
`localStorage['momsite:shift']`, written on every change and restored on app load.

```ts
type Criticality = 'high' | 'medium' | 'low';
type Hall = 'high' | 'low';

interface Room {
  number: number;          // e.g., 915
  hall: Hall;
  position: number;        // 0..14 on the floor walk
  pairId: number;          // rooms across from each other share a pairId
  occupied: boolean;
  criticality: Criticality | null;  // null when empty
  assignedTo: number | null;        // RN index, or null
}

interface RN {
  id: number;              // 0, 1, 2 ... — displayed as "RN1", "RN2"
  assignedRooms: number[]; // room numbers
}

interface ShiftState {
  ratio: number;           // default 4, max 5
  rnCount: number;
  rooms: Room[];           // full 30-room floor, prepopulated
  rns: RN[];               // length === rnCount
}
```

### 5.1 Derived values (computed, not stored)

- `workloadScore(rn)` — sum of (high=3, med=2, low=1) for assigned rooms
- `recommendedRnCount` — `ceil(occupiedCount / ratio)`
- `distance(roomA, roomB)` — as defined in §3.1

## 6. Screens

Four screens navigated via a bottom tab bar (Setup / Census / Assignments), plus a
small About page reachable from a header icon, plus modal flows (Admission, Confirm
Dialog) that slide over the current screen rather than taking over the router.

### 6.1 Setup (`/`)

- Header: "Shift Setup" with a "New Shift" destructive action (confirm modal)
- Ratio stepper (−/+), clamped 1–5, default 4
- Available RNs stepper, default = recommended count, live-updates
- Recommended RN count display: "Recommended: N (X patients ÷ ratio Y)"
- Census summary card: total occupied + breakdown by criticality
- Primary button: "Distribute →" (disabled when RNs < 1 or patients < 1)

### 6.2 Census (`/census`)

- Tab switcher: **List** | **Map**
- **List view:** two collapsible sections (High Hall, Low Hall). Each room is a row
  with its number and a colored chip for criticality, or "Empty." Tap opens a
  bottom-sheet picker (H / M / L / Empty) with large touch targets.
- **Map view:** the L-shape floor renderer. Each room is a tappable cell colored by
  criticality. Tap opens the same bottom-sheet picker.
- Sticky footer: "N patients occupied" + "Distribute" button

### 6.3 Assignments (`/assignments`)

- Tab switcher: **List** | **Map**
- **List view:** one card per RN. Header shows `RN{n} — N rooms — score S`, body
  shows room numbers as colored chips (criticality). Tap a chip → "Move to..." sheet
  lists other RNs with a one-tap move.
- **Map view:** same L-shape renderer. Each room cell is color-coded by criticality
  and bordered by its RN color. Legend at the bottom maps RN numbers to colors.
- Sticky footer: "+ Admission" and "Re-distribute" buttons

### 6.4 Admission modal (over `/assignments`)

- "New patient arrived in room..." picker (only empty rooms shown)
- Criticality picker (H / M / L)
- "Find best RN" button → returns top 3 RN suggestions with explanations
  (e.g., "RN2 — closest (adjacent to 922), load 7/12 after admission")
- Tap a suggestion → assigns the patient, closes modal, returns to Assignments

### 6.5 About (`/about`)

- App version, short "how the math works" blurb, "Clear all data" button

## 7. Distribution Algorithm

Lives in `src/lib/distribute.ts` as a pure function:
`distribute(rooms: Room[], rnCount: number) → RN[]`.

**Scoring:** HIGH = 3, MEDIUM = 2, LOW = 1.

**Algorithm (split-and-swap):**

1. **Sort occupied rooms by floor-walk position.** This gives a 1-D list where
   neighbors are physically adjacent.
2. **Initial split by score.** Walk the sorted list and cut it into N contiguous
   chunks such that each chunk's total score is approximately `totalScore / N`.
   This is the classic "partition array into N parts" problem, solved greedily.
3. **Rebalance criticality mix.** For each pair of neighboring zones, try swapping
   a single boundary room if the swap improves the criticality spread without
   unbalancing the scores by more than 1 point. Repeat until no improving swap
   exists, or up to a fixed small number of passes.
4. **Return** each chunk as an RN's `assignedRooms`.

**Justification:** At this scale (≤30 rooms, ≤6 RNs) the search space is tiny.
Greedy partition + boundary swaps gives near-optimal results, runs in microseconds,
and is easy to test and explain.

### 7.1 Edge cases

- **Under-staffed** (fewer RNs than recommended) → app still distributes; the UI
  shows a warning banner like "⚠ 20 patients, 3 RNs = 6.7 each. Above ratio 4."
- **Over-staffed** (more RNs than occupied rooms) → extra RNs get empty lists and
  are labeled as "floaters." No crash.
- **Zero patients** → Distribute button is disabled on Setup.
- **Single patient** → the first RN gets it, the rest are empty.

## 8. Admission Recommendation Algorithm

Lives in `src/lib/recommend.ts` as a pure function:
`recommend(newRoom: number, newLevel: Criticality, state: ShiftState) → Suggestion[]`.

**Hard rule:** drop any RN whose current room count ≥ `ratio`. Capacity is
non-negotiable.

**Blended score for each remaining RN** (lower is better):

```
score(rn) =
    2.0  * minDistance(newRoom, rn.rooms)
  + 1.5  * (rn.currentScore + newLevel.value)
  + 1.0  * mixPenalty(rn.rooms + newRoom)
```

- `minDistance` — smallest floor-walk distance from the new room to any of the RN's
  current rooms. Rewards proximity.
- `workload projection` — what the RN's total score would become if this patient is
  added. Rewards lighter loads.
- `mixPenalty` — quantifies how lopsided the RN's H/M/L distribution would become
  (e.g., 3 highs + 0 others is heavily penalized; 1-1-1 is not).

**Default weights:** distance 2.0, workload 1.5, mix 1.0. Constants in the file so
they can be tuned later.

**Return top 3** sorted by score, each with a one-line explanation referencing the
contributing factors (distance, load, mix). Explanations are part of the API, not
decorative — they let the user override confidently.

### 8.1 Edge cases

- All RNs capped → return empty array; UI shows "All RNs at capacity."
- Fewer than 3 eligible RNs → return however many exist.
- New room already occupied → UI prevents this (picker only shows empty rooms).

## 9. Technology Stack

- **React 18 + Vite + TypeScript** — framework, build, types
- **react-router-dom** — client-side routing for the 4 main routes
- **Vanilla CSS + CSS variables** — no CSS framework, keeps bundle small and styling
  focused
- **vite-plugin-pwa** (workbox under the hood) — service worker, manifest, offline
- **localStorage** — in-shift persistence
- **Vitest + React Testing Library** — unit and component tests
- **Playwright** — one end-to-end smoke test

## 10. PWA, Offline, and Deployment

- `vite-plugin-pwa` generates `manifest.webmanifest` with app name, theme color, and
  192/512px icons.
- The service worker uses a cache-first strategy to pre-cache the app shell. After
  the first successful load, the app works completely offline.
- There are no runtime network calls: no fonts fetched from a CDN, no analytics, no
  API calls. Everything ships in the bundle.

### 10.1 Deployment target: GitHub Pages

The app deploys to **GitHub Pages** via a GitHub Actions workflow:

- Repo lives under the user's GitHub account. Suggested name: `momsite` or
  `charge-nurse-assigner`. The repo must be public for free GitHub Pages (or the
  user's account needs GitHub Pro for private Pages).
- Final URL pattern: `https://<username>.github.io/<repo-name>/` — this is a
  **subpath** deployment, which matters for the next bullet.
- `vite.config.ts` sets `base: '/<repo-name>/'` so all built asset paths resolve
  correctly under the subpath. The base path also needs to be reflected in the
  `scope` and `start_url` fields of the PWA manifest.
- A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to
  `main`: it installs deps, runs tests, runs `npm run build`, and deploys the
  `dist/` folder to the `gh-pages` branch using `actions/deploy-pages@v4`. GitHub
  Pages serves that branch.
- HTTPS is automatic on `*.github.io` — PWA install prompts work out of the box on
  Samsung Chrome.

### 10.2 Installation on the phone

On Samsung Chrome, the user visits the GitHub Pages URL, taps the ⋮ menu, and picks
"Add to Home Screen." The app icon appears on the home screen. Tapping it launches
fullscreen like a native app and works offline after the first load.

## 11. File Structure

```
MomSite/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages deploy on push to main
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── robots.txt
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── state/
│   │   ├── ShiftContext.tsx     # React context + reducer
│   │   ├── storage.ts           # localStorage load/save
│   │   └── initialState.ts      # The 30 static rooms + defaults
│   ├── lib/
│   │   ├── distribute.ts        # Distribution algorithm (pure)
│   │   ├── recommend.ts         # Admission recommendation (pure)
│   │   ├── floor.ts             # Room positions, distances, pairs
│   │   └── types.ts             # Shared types
│   ├── pages/
│   │   ├── Setup.tsx
│   │   ├── Census.tsx
│   │   ├── Assignments.tsx
│   │   └── About.tsx
│   ├── components/
│   │   ├── FloorMap.tsx         # Shared L-shape renderer
│   │   ├── RoomCell.tsx         # Single cell with criticality/RN coloring
│   │   ├── CriticalityPicker.tsx# Bottom sheet H/M/L/Empty
│   │   ├── AdmissionModal.tsx
│   │   ├── RnCard.tsx
│   │   ├── BottomNav.tsx
│   │   └── ConfirmDialog.tsx
│   └── styles/
│       ├── global.css
│       └── theme.css
├── tests/
│   ├── distribute.test.ts
│   ├── recommend.test.ts
│   ├── floor.test.ts
│   └── e2e/
│       └── smoke.spec.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 11.1 Key principles

- **Pure logic separated from UI.** `lib/` has no React. `distribute` and
  `recommend` take plain data and return plain data, so they can be tested in
  isolation.
- **Single source of truth for the floor.** `lib/floor.ts` defines all 30 rooms,
  their positions, pairs, and the distance function. Nothing else hardcodes room
  data.
- **`FloorMap` is shared** between Census (tap to edit) and Assignments (view-only
  with RN badges). The component takes a render-mode prop.
- **Small, focused files.** Each page is thin and delegates to components. State
  logic lives in `state/`, not in pages.

## 12. Testing Strategy

### 12.1 Unit tests (Vitest)

**`distribute.test.ts` — hard cases:**
- Empty census → N empty RNs
- Single patient → first RN gets it
- Perfectly balanced case (6 patients of equal criticality, 3 RNs)
- Unbalanced case (3 highs + 3 lows, 2 RNs) — scores within 1 point
- Contiguity check — every RN's rooms form a contiguous position range
- Cross-hall case — RN zone spans the station, distances correct
- All-high case (6 highs, 2 RNs) → each gets 3 highs
- Fewer patients than RNs → extras are empty
- More RNs than positions → no crash
- Random-seed fuzz test: 50 random censuses, assert max-min score ≤ one "high" unit

**`recommend.test.ts`:**
- Capacity cap respected — RN at limit never appears
- Adjacency winner when workloads are equal
- Workload winner when distances are equal
- Returns ≤ 3 results
- Returns fewer than 3 when eligible RNs are fewer
- All-capped case returns empty
- Explanation strings are non-empty and reference distance + load

**`floor.test.ts`:**
- All 30 rooms have valid positions 0..14
- Odd/even rooms at the same position are paired
- `distance` is symmetric
- Distance across station works (915 ↔ 901 = 1)

### 12.2 Component tests (Vitest + React Testing Library)

- `CriticalityPicker` renders four options, fires the right callback
- `FloorMap` renders all 30 rooms with correct colors for a given state
- `RnCard` shows rooms, score, opens the move sheet on tap
- `Setup` enables Distribute only when conditions are met

### 12.3 End-to-end test (Playwright)

One smoke test walking the full happy path:

1. Load app, set ratio 4, RNs to 4
2. Open Census, tap several rooms to set criticalities
3. Tap Distribute
4. Navigate to Assignments, verify each RN has rooms, verify map view renders
5. Open Admission modal, pick empty room + level, tap Find Best RN, verify 3
   suggestions appear
6. Tap New Shift, confirm, verify census is cleared

### 12.4 Explicitly out of scope

- Pixel-perfect visual regression tests
- Component tests for trivial display-only components
- Service worker behavior — trust vite-plugin-pwa

## 13. Open Questions / Future Work

None blocking. Possible future enhancements if the user requests them later:

- Shift history (multiple saved shifts)
- Multiple floor layouts (other units)
- Cloud sync across devices
- Manual zone drawing (pre-commit to assignments)

These are explicitly **not** in scope for v1.
