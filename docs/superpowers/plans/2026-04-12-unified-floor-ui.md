# Unified Floor UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Census, Assignments, and Setup into a 3-tab layout (RNs / Map / Patients) with a one-time Setup Wizard overlay, eliminating redundant map/list views.

**Architecture:** Add a `distributed` boolean to ShiftState to gate the Setup Wizard overlay. Delete the three old pages and create three new tab pages (PatientsTab, MapTab, RnsTab), a SetupWizard overlay, and an ActionPicker bottom sheet. The existing FloorMap, RnCard, CriticalityPicker, AdmissionModal, ConfirmDialog, and BottomSheet components are reused as-is or with minor changes.

**Tech Stack:** React 18, TypeScript, react-router-dom v6, Vitest, Playwright

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/types.ts` | Modify | Add `distributed: boolean` to `ShiftState` |
| `src/state/initialState.ts` | Modify | Add `distributed: false` to initial state |
| `src/state/ShiftContext.tsx` | Modify | Set `distributed: true` on `DISTRIBUTE`, handle migration in `loadShift` |
| `src/state/storage.ts` | Modify | Migrate old localStorage data (add `distributed` default) |
| `src/components/SetupWizard.tsx` | Create | Full-screen overlay: RN count, ratio, census grid, distribute button |
| `src/components/ActionPicker.tsx` | Create | Bottom sheet: Change Acuity / Move RN / Discharge |
| `src/components/AdmissionModal.tsx` | Modify | Accept optional `preSelectedRoom` prop |
| `src/components/BottomNav.tsx` | Modify | 3 tabs: RNs, Map, Patients |
| `src/pages/PatientsTab.tsx` | Create | Flat room list with admission button |
| `src/pages/MapTab.tsx` | Create | FloorMap with action picker / admission on tap |
| `src/pages/RnsTab.tsx` | Create | RN list with locks, summary stats, new shift |
| `src/pages/Setup.tsx` | Delete | Replaced by SetupWizard |
| `src/pages/Census.tsx` | Delete | Absorbed into SetupWizard + ActionPicker |
| `src/pages/Assignments.tsx` | Delete | Replaced by PatientsTab |
| `src/App.tsx` | Modify | New routes, conditional SetupWizard overlay |
| `src/pages/About.tsx` | Modify | Navigate to `/rns` instead of `/` after clear |
| `tests/e2e/smoke.spec.ts` | Modify | Rewrite for new flow |

---

## Task 1: Add `distributed` flag to state

**Files:**
- Modify: `src/lib/types.ts:20-25`
- Modify: `src/state/initialState.ts:8-15`
- Modify: `src/state/ShiftContext.tsx:60-68,91-93`
- Modify: `src/state/storage.ts:6-19`
- Modify: `tests/recommend.test.ts:25`

- [ ] **Step 1.1: Add `distributed` to ShiftState interface**

In `src/lib/types.ts`, replace:

```ts
export interface ShiftState {
  ratio: number;
  rnCount: number;
  rooms: Room[];
  rns: RN[];
}
```

with:

```ts
export interface ShiftState {
  ratio: number;
  rnCount: number;
  rooms: Room[];
  rns: RN[];
  distributed: boolean;
}
```

- [ ] **Step 1.2: Add `distributed: false` to initial state**

In `src/state/initialState.ts`, replace:

```ts
export function createInitialState(): ShiftState {
  return {
    ratio: DEFAULT_RATIO,
    rnCount: 0,
    rooms: createEmptyRooms(),
    rns: [],
  };
}
```

with:

```ts
export function createInitialState(): ShiftState {
  return {
    ratio: DEFAULT_RATIO,
    rnCount: 0,
    rooms: createEmptyRooms(),
    rns: [],
    distributed: false,
  };
}
```

- [ ] **Step 1.3: Set `distributed: true` in the DISTRIBUTE reducer case**

In `src/state/ShiftContext.tsx`, replace:

```ts
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
```

with:

```ts
    case 'DISTRIBUTE': {
      const rns = distribute(state.rooms, state.rnCount);
      const rooms = state.rooms.map((r) => {
        const assignedTo = rns.findIndex((rn) =>
          rn.assignedRooms.includes(r.number)
        );
        return { ...r, assignedTo: assignedTo === -1 ? null : assignedTo };
      });
      return { ...state, rns, rooms, distributed: true };
    }
```

- [ ] **Step 1.4: Migrate old localStorage data in storage.ts**

In `src/state/storage.ts`, replace:

```ts
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
```

with:

```ts
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
    // Migration: old data lacks `distributed`. If any RN has assigned rooms,
    // the shift was already distributed.
    if (typeof parsed.distributed !== 'boolean') {
      parsed.distributed = parsed.rns.some((rn) => rn.assignedRooms.length > 0);
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}
```

- [ ] **Step 1.5: Update test helper to include `distributed`**

In `tests/recommend.test.ts`, replace:

```ts
  return { ratio: args.ratio, rnCount: rns.length, rooms, rns };
```

with:

```ts
  return { ratio: args.ratio, rnCount: rns.length, rooms, rns, distributed: true };
```

- [ ] **Step 1.6: Type-check and run tests**

Run: `npm run lint && npm test -- --run`
Expected: lint passes, 36 tests pass

- [ ] **Step 1.7: Commit**

```bash
git add src/lib/types.ts src/state/initialState.ts src/state/ShiftContext.tsx src/state/storage.ts tests/recommend.test.ts
git commit -m "feat(state): add distributed flag to ShiftState with localStorage migration"
```

---

## Task 2: Create SetupWizard component

**Files:**
- Create: `src/components/SetupWizard.tsx`

- [ ] **Step 2.1: Create src/components/SetupWizard.tsx**

```tsx
import { useState } from 'react';
import { useShift, occupiedCount, criticalityCounts, recommendedRnCount } from '../state/ShiftContext';
import { MIN_RATIO, MAX_RATIO } from '../state/initialState';
import { Criticality, Room } from '../lib/types';
import CriticalityPicker from './CriticalityPicker';

export default function SetupWizard() {
  const { state, dispatch } = useShift();
  const [picking, setPicking] = useState<Room | null>(null);

  const total = occupiedCount(state);
  const counts = criticalityCounts(state);
  const recommended = recommendedRnCount(state);
  const canDistribute = total > 0 && state.rnCount > 0;
  const underStaffed = state.rnCount > 0 && state.rnCount < recommended;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--bg)',
        overflowY: 'auto',
      }}
    >
      <header className="page-header">
        <h2>New Shift</h2>
      </header>

      <main className="page">
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
          <div className="label">Census — tap rooms to set acuity</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {state.rooms.map((r) => {
              const chipClass = r.criticality
                ? `chip-${r.criticality === 'medium' ? 'med' : r.criticality}`
                : 'chip-empty';
              return (
                <button
                  key={r.number}
                  onClick={() => setPicking(r)}
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  <div>{r.number}</div>
                  <span className={`chip ${chipClass}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                    {r.criticality ? r.criticality[0].toUpperCase() : '—'}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className="chip chip-high">{counts.high} HIGH</span>
            <span className="chip chip-med">{counts.medium} MED</span>
            <span className="chip chip-low">{counts.low} LOW</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: 13 }}>
              {total} occupied
            </span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={!canDistribute}
          onClick={() => dispatch({ type: 'DISTRIBUTE' })}
        >
          Distribute →
        </button>
      </main>

      <CriticalityPicker
        open={picking !== null}
        roomNumber={picking?.number ?? null}
        current={picking?.criticality ?? null}
        onClose={() => setPicking(null)}
        onPick={(level) => {
          if (picking) {
            dispatch({ type: 'SET_CRITICALITY', room: picking.number, level });
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 2.3: Commit**

```bash
git add src/components/SetupWizard.tsx
git commit -m "feat(SetupWizard): create shift setup overlay with RN count, ratio, census grid"
```

---

## Task 3: Create ActionPicker component

**Files:**
- Create: `src/components/ActionPicker.tsx`

- [ ] **Step 3.1: Create src/components/ActionPicker.tsx**

This component handles the three-way action choice when tapping an occupied room, then delegates to sub-sheets for each action.

```tsx
import { useState } from 'react';
import { useShift, workloadScore } from '../state/ShiftContext';
import { Room } from '../lib/types';
import BottomSheet from './BottomSheet';
import CriticalityPicker from './CriticalityPicker';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  room: Room | null;
  onClose: () => void;
}

type SubAction = null | 'acuity' | 'move' | 'discharge';

export default function ActionPicker({ room, onClose }: Props) {
  const { state, dispatch } = useShift();
  const [sub, setSub] = useState<SubAction>(null);

  const close = () => {
    setSub(null);
    onClose();
  };

  const rn = room?.assignedTo !== null && room?.assignedTo !== undefined
    ? state.rns.find((r) => r.id === room.assignedTo)
    : null;

  const critLabel = room?.criticality
    ? room.criticality.toUpperCase()
    : 'EMPTY';

  const rnLabel = rn ? `RN${rn.id + 1}` : 'Unassigned';

  // Main action picker
  if (sub === null) {
    return (
      <BottomSheet
        open={room !== null}
        title={room ? `Room ${room.number}` : 'Room'}
        onClose={close}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          {critLabel} · {rnLabel}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <button
            onClick={() => setSub('acuity')}
            style={{
              flex: 1,
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 'var(--space-1)' }}>●</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Change Acuity</div>
          </button>
          <button
            onClick={() => setSub('move')}
            style={{
              flex: 1,
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 'var(--space-1)' }}>↔</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Move RN</div>
          </button>
        </div>
        <button
          onClick={() => setSub('discharge')}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius)',
            background: 'var(--danger)',
            color: 'var(--danger-contrast)',
            fontWeight: 600,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          Discharge
        </button>
      </BottomSheet>
    );
  }

  // Sub-action: Change Acuity
  if (sub === 'acuity') {
    return (
      <CriticalityPicker
        open
        roomNumber={room?.number ?? null}
        current={room?.criticality ?? null}
        onClose={close}
        onPick={(level) => {
          if (room) {
            dispatch({ type: 'SET_CRITICALITY', room: room.number, level });
          }
          close();
        }}
      />
    );
  }

  // Sub-action: Move RN
  if (sub === 'move') {
    return (
      <BottomSheet
        open
        title={room ? `Move Room ${room.number}` : 'Move'}
        onClose={close}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {state.rns.map((rnItem) => {
            const score = workloadScore(rnItem, state);
            const already = room !== null && rnItem.assignedRooms.includes(room.number);
            return (
              <button
                key={rnItem.id}
                disabled={already}
                onClick={() => {
                  if (room) {
                    dispatch({ type: 'MOVE_ROOM', room: room.number, toRnId: rnItem.id });
                  }
                  close();
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  borderLeft: `4px solid var(--rn-${rnItem.id % 6})`,
                  opacity: already ? 0.4 : 1,
                }}
              >
                <strong>RN{rnItem.id + 1}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {rnItem.assignedRooms.length} rooms · score {score}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    );
  }

  // Sub-action: Discharge
  return (
    <ConfirmDialog
      open
      title={`Discharge Room ${room?.number}`}
      message="This will remove the patient and mark the room as empty."
      confirmLabel="Discharge"
      destructive
      onCancel={close}
      onConfirm={() => {
        if (room) {
          dispatch({ type: 'SET_CRITICALITY', room: room.number, level: null });
        }
        close();
      }}
    />
  );
}
```

- [ ] **Step 3.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3.3: Commit**

```bash
git add src/components/ActionPicker.tsx
git commit -m "feat(ActionPicker): create room action sheet with acuity/move/discharge"
```

---

## Task 4: Update AdmissionModal to accept pre-selected room

**Files:**
- Modify: `src/components/AdmissionModal.tsx`

- [ ] **Step 4.1: Add `preSelectedRoom` prop**

In `src/components/AdmissionModal.tsx`, replace:

```tsx
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
```

with:

```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  preSelectedRoom?: number | null;
}

export default function AdmissionModal({ open, onClose, preSelectedRoom }: Props) {
  const { state, dispatch } = useShift();
  const [roomNumber, setRoomNumber] = useState<number | null>(null);
  const [level, setLevel] = useState<Criticality | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const empties = useMemo(() => emptyRooms(state), [state]);

  // When opening with a pre-selected room, set it
  const effectiveRoom = roomNumber ?? preSelectedRoom ?? null;

  const reset = () => {
    setRoomNumber(null);
    setLevel(null);
    setSuggestions(null);
  };

  const close = () => {
    reset();
    onClose();
  };
```

Then replace every reference to `roomNumber` in the JSX and handlers with `effectiveRoom`. Specifically, replace the `findBest` function:

```tsx
  const findBest = () => {
    if (effectiveRoom === null || level === null) return;
    const result = recommend(effectiveRoom, level, state);
    setSuggestions(result);
  };
```

Replace the `assign` function:

```tsx
  const assign = (rnId: number) => {
    if (effectiveRoom === null || level === null) return;
    dispatch({ type: 'SET_CRITICALITY', room: effectiveRoom, level });
    dispatch({ type: 'MOVE_ROOM', room: effectiveRoom, toRnId: rnId });
    close();
  };
```

Replace the room button `onClick` and selected style to use `effectiveRoom`:

```tsx
              <button
                key={r.number}
                onClick={() => setRoomNumber(r.number)}
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  background: effectiveRoom === r.number ? 'var(--primary)' : 'var(--bg)',
                  color: effectiveRoom === r.number ? 'var(--primary-contrast)' : 'inherit',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                }}
              >
```

Replace the disabled check on the Find best RN button:

```tsx
        <button
          className="btn btn-primary"
          disabled={effectiveRoom === null || level === null}
          onClick={findBest}
        >
```

- [ ] **Step 4.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4.3: Commit**

```bash
git add src/components/AdmissionModal.tsx
git commit -m "feat(AdmissionModal): add preSelectedRoom prop for map/list integration"
```

---

## Task 5: Create PatientsTab page

**Files:**
- Create: `src/pages/PatientsTab.tsx`

- [ ] **Step 5.1: Create src/pages/PatientsTab.tsx**

```tsx
import { useState } from 'react';
import { useShift } from '../state/ShiftContext';
import { Room } from '../lib/types';
import ActionPicker from '../components/ActionPicker';
import AdmissionModal from '../components/AdmissionModal';

export default function PatientsTab() {
  const { state } = useShift();
  const [actionRoom, setActionRoom] = useState<Room | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionRoom, setAdmissionRoom] = useState<number | null>(null);

  const occupied = state.rooms
    .filter((r) => r.occupied)
    .sort((a, b) => a.number - b.number);

  const empty = state.rooms
    .filter((r) => !r.occupied)
    .sort((a, b) => a.number - b.number);

  const handleRoomTap = (room: Room) => {
    if (room.occupied) {
      setActionRoom(room);
    } else {
      setAdmissionRoom(room.number);
      setAdmissionOpen(true);
    }
  };

  return (
    <>
      <header className="page-header">
        <h2>Patients</h2>
      </header>

      <main className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {occupied.map((r) => {
            const rn = r.assignedTo !== null ? state.rns.find((n) => n.id === r.assignedTo) : null;
            return (
              <button
                key={r.number}
                onClick={() => handleRoomTap(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                  gap: 'var(--space-3)',
                }}
              >
                <strong style={{ width: 36 }}>{r.number}</strong>
                <span
                  className={`chip chip-${r.criticality === 'medium' ? 'med' : r.criticality}`}
                >
                  {r.criticality!.toUpperCase()}
                </span>
                <span style={{ flex: 1 }} />
                {rn && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: `color-mix(in srgb, var(--rn-${rn.id % 6}) 15%, transparent)`,
                      color: `var(--rn-${rn.id % 6})`,
                      fontSize: 12,
                      fontWeight: 600,
                      borderLeft: `3px solid var(--rn-${rn.id % 6})`,
                    }}
                  >
                    RN{rn.id + 1}{rn.locked ? ' 🔒' : ''}
                  </span>
                )}
              </button>
            );
          })}

          {empty.map((r) => (
            <button
              key={r.number}
              onClick={() => handleRoomTap(r)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                gap: 'var(--space-3)',
                opacity: 0.5,
              }}
            >
              <strong style={{ width: 36, color: 'var(--text-muted)' }}>{r.number}</strong>
              <span className="chip chip-empty">EMPTY</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
            </button>
          ))}
        </div>

        <div style={{ height: 80 }} />
      </main>

      <div className="sticky-footer">
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => {
            setAdmissionRoom(null);
            setAdmissionOpen(true);
          }}
        >
          + Admission
        </button>
      </div>

      <ActionPicker room={actionRoom} onClose={() => setActionRoom(null)} />

      <AdmissionModal
        open={admissionOpen}
        onClose={() => {
          setAdmissionOpen(false);
          setAdmissionRoom(null);
        }}
        preSelectedRoom={admissionRoom}
      />
    </>
  );
}
```

- [ ] **Step 5.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 5.3: Commit**

```bash
git add src/pages/PatientsTab.tsx
git commit -m "feat(PatientsTab): create flat room list page with action picker and admission"
```

---

## Task 6: Create MapTab page

**Files:**
- Create: `src/pages/MapTab.tsx`

- [ ] **Step 6.1: Create src/pages/MapTab.tsx**

```tsx
import { useState } from 'react';
import { useShift } from '../state/ShiftContext';
import { Room } from '../lib/types';
import FloorMap from '../components/FloorMap';
import ActionPicker from '../components/ActionPicker';
import AdmissionModal from '../components/AdmissionModal';

export default function MapTab() {
  const { state } = useShift();
  const [actionRoom, setActionRoom] = useState<Room | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionRoom, setAdmissionRoom] = useState<number | null>(null);

  const handleRoomClick = (room: Room) => {
    if (room.occupied) {
      setActionRoom(room);
    } else {
      setAdmissionRoom(room.number);
      setAdmissionOpen(true);
    }
  };

  return (
    <>
      <header className="page-header">
        <h2>Map</h2>
      </header>

      <main className="page">
        <FloorMap
          rooms={state.rooms}
          onRoomClick={handleRoomClick}
          showLegend
          rnCount={state.rnCount}
        />
      </main>

      <ActionPicker room={actionRoom} onClose={() => setActionRoom(null)} />

      <AdmissionModal
        open={admissionOpen}
        onClose={() => {
          setAdmissionOpen(false);
          setAdmissionRoom(null);
        }}
        preSelectedRoom={admissionRoom}
      />
    </>
  );
}
```

- [ ] **Step 6.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 6.3: Commit**

```bash
git add src/pages/MapTab.tsx
git commit -m "feat(MapTab): create floor map page with action picker and admission"
```

---

## Task 7: Create RnsTab page

**Files:**
- Create: `src/pages/RnsTab.tsx`

- [ ] **Step 7.1: Create src/pages/RnsTab.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift, occupiedCount } from '../state/ShiftContext';
import { Room } from '../lib/types';
import RnCard from '../components/RnCard';
import ConfirmDialog from '../components/ConfirmDialog';
import ActionPicker from '../components/ActionPicker';

export default function RnsTab() {
  const { state, dispatch, newShift } = useShift();
  const navigate = useNavigate();
  const [confirmNew, setConfirmNew] = useState(false);
  const [actionRoom, setActionRoom] = useState<Room | null>(null);

  const occupied = occupiedCount(state);
  const totalRooms = state.rooms.length;

  return (
    <>
      <header className="page-header">
        <h2>RNs</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/about')}>
            About
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--danger)' }}
            onClick={() => setConfirmNew(true)}
          >
            New Shift
          </button>
        </div>
      </header>

      <main className="page">
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
            <div className="label">Ratio</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>1:{state.ratio}</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
            <div className="label">Occupied</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{occupied}</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', marginBottom: 0 }}>
            <div className="label">Empty</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totalRooms - occupied}</div>
          </div>
        </div>

        {state.rns.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--text-muted)' }}>
              No RNs on this shift yet.
            </p>
          </div>
        ) : (
          state.rns.map((rn) => (
            <RnCard
              key={rn.id}
              rn={rn}
              rooms={state.rooms}
              onRoomTap={(n) => {
                const room = state.rooms.find((r) => r.number === n) ?? null;
                setActionRoom(room);
              }}
              onToggleLock={() => dispatch({ type: 'TOGGLE_LOCK', rnId: rn.id })}
            />
          ))
        )}
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

      <ActionPicker room={actionRoom} onClose={() => setActionRoom(null)} />
    </>
  );
}
```

- [ ] **Step 7.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/RnsTab.tsx
git commit -m "feat(RnsTab): create RN list page with locks, summary stats, new shift"
```

---

## Task 8: Update BottomNav, App routes, and delete old pages

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/About.tsx:53`
- Delete: `src/pages/Setup.tsx`
- Delete: `src/pages/Census.tsx`
- Delete: `src/pages/Assignments.tsx`

- [ ] **Step 8.1: Replace BottomNav.tsx**

Replace the entire contents of `src/components/BottomNav.tsx` with:

```tsx
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/rns', label: 'RNs' },
  { to: '/', label: 'Map' },
  { to: '/patients', label: 'Patients' },
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

- [ ] **Step 8.2: Replace App.tsx**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShiftProvider, useShift } from './state/ShiftContext';
import BottomNav from './components/BottomNav';
import SetupWizard from './components/SetupWizard';
import MapTab from './pages/MapTab';
import PatientsTab from './pages/PatientsTab';
import RnsTab from './pages/RnsTab';
import About from './pages/About';

function AppShell() {
  const { state } = useShift();

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<MapTab />} />
        <Route path="/patients" element={<PatientsTab />} />
        <Route path="/rns" element={<RnsTab />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      {!state.distributed && <SetupWizard />}
    </div>
  );
}

export default function App() {
  return (
    <ShiftProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell />
      </BrowserRouter>
    </ShiftProvider>
  );
}
```

Note: `AppShell` is a separate component inside `ShiftProvider` so it can call `useShift()`.

- [ ] **Step 8.3: Update About.tsx navigation**

In `src/pages/About.tsx`, replace:

```tsx
          navigate('/');
```

with:

```tsx
          navigate('/rns');
```

- [ ] **Step 8.4: Delete old pages**

```bash
rm src/pages/Setup.tsx src/pages/Census.tsx src/pages/Assignments.tsx
```

- [ ] **Step 8.5: Type-check and run unit tests**

Run: `npm run lint && npm test -- --run`
Expected: lint passes, 36 tests pass

- [ ] **Step 8.6: Commit**

```bash
git add -A
git commit -m "feat(app): wire 3-tab layout with SetupWizard overlay, delete old pages"
```

---

## Task 9: Update E2E tests for new flow

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 9.1: Replace tests/e2e/smoke.spec.ts**

Replace the entire file with:

```ts
import { test, expect } from '@playwright/test';

test('happy path: setup wizard, distribute, admission, new shift', async ({ page }) => {
  await page.goto('/');

  // Setup Wizard should be visible
  await expect(page.getByRole('heading', { name: 'New Shift' })).toBeVisible();

  // Set RN count to 3
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();

  // Set census: tap rooms to set acuity
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();

  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /^919/ }).click();
  await page.getByRole('dialog').getByText('LOW').first().click();

  // Distribute
  await page.getByRole('button', { name: /Distribute/ }).click();

  // Wizard should close, Map tab should be visible (default route)
  await expect(page.getByRole('heading', { name: 'New Shift' })).not.toBeVisible();

  // Navigate to Patients tab
  await page.getByRole('link', { name: 'Patients' }).click();
  await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();

  // Should see occupied rooms in the list
  await expect(page.getByText('915')).toBeVisible();
  await expect(page.getByText('917')).toBeVisible();
  await expect(page.getByText('919')).toBeVisible();

  // Open admission
  await page.getByRole('button', { name: '+ Admission' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick room 921 and medium acuity
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /load/ }).first();
  await expect(firstSuggestion).toBeVisible();
  await firstSuggestion.click();

  // Room 921 should now appear in the patient list
  await expect(page.getByText('921')).toBeVisible();

  // New Shift — go to RNs tab
  await page.getByRole('link', { name: 'RNs' }).click();
  await page.getByRole('button', { name: 'New Shift' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();

  // Setup Wizard should reappear
  await expect(page.getByRole('heading', { name: 'New Shift' })).toBeVisible();
});

test('locked RN is excluded from admission suggestions', async ({ page }) => {
  await page.goto('/');

  // Setup: 2 RNs, 2 rooms
  await page.getByLabel('Increase RN count').click();
  await page.getByLabel('Increase RN count').click();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();

  // Go to RNs tab and lock RN 1
  await page.getByRole('link', { name: 'RNs' }).click();
  await page.getByLabel('Lock RN 1').click();
  await expect(page.getByLabel('Unlock RN 1')).toBeVisible();

  // Go to Patients tab and open admission
  await page.getByRole('link', { name: 'Patients' }).click();
  await page.getByRole('button', { name: '+ Admission' }).click();

  await page.getByRole('dialog').getByRole('button', { name: '919' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Only RN2 should appear (RN1 is locked)
  const suggestionButtons = page.getByRole('dialog').locator('button').filter({ hasText: /load/ });
  await expect(suggestionButtons).toHaveCount(1);
  await expect(suggestionButtons.first()).toContainText('RN2');

  await suggestionButtons.first().click();
  await expect(page.getByText('919')).toBeVisible();
});

test('discharge removes patient via action picker', async ({ page }) => {
  await page.goto('/');

  // Setup: 1 RN, 2 rooms
  await page.getByLabel('Increase RN count').click();

  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();

  // Navigate to Patients tab
  await page.getByRole('link', { name: 'Patients' }).click();

  // Tap room 915 row to open action picker
  await page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'HIGH' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tap Discharge in action picker
  await page.getByRole('button', { name: 'Discharge' }).click();

  // Confirm discharge
  await page.getByRole('dialog').getByRole('button', { name: 'Discharge' }).click();

  // Room 915 should no longer show as occupied (should be in empty section or gone)
  await expect(page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'HIGH' })).toHaveCount(0);
});
```

- [ ] **Step 9.2: Run unit tests**

Run: `npm test -- --run`
Expected: 36 tests pass

- [ ] **Step 9.3: Run E2E tests**

Run: `npm run test:e2e`
Expected: 3 tests pass (may take up to 2 minutes for build + test)

- [ ] **Step 9.4: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test(e2e): rewrite smoke tests for unified 3-tab layout"
```

---

## Done

After all 9 tasks:
- Setup Wizard appears at shift start, goes away after Distribute
- 3-tab layout: RNs (locks, stats, new shift) | Map (center, L-shape floor) | Patients (flat room list)
- Action Picker on any occupied room: Change Acuity / Move RN / Discharge
- Tapping empty room on Map or Patients opens Admission with room pre-selected
- Old Setup, Census, and Assignments pages deleted
- `distributed` flag in state with localStorage migration
- 36 unit tests pass + 3 E2E tests pass
