# RN Locking & Discharge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RN locking (fully frozen — keep rooms, skip for new patients) and room discharge to the Assignments page, and remove the re-distribute button to prevent accidental mid-shift reshuffling.

**Architecture:** Add `locked: boolean` to the `RN` type. The `recommend()` function filters out locked RNs alongside its existing ratio-cap filter. The Assignments page gets lock toggles on RN cards, a discharge button in the move sheet, and loses the re-distribute button. The AdmissionModal gains RN lock toggles so mom can adjust locks right before finding the best RN.

**Tech Stack:** React 18, TypeScript, Vitest, Playwright (same as existing)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/types.ts` | Modify | Add `locked: boolean` to `RN` interface |
| `src/lib/distribute.ts` | Modify | Include `locked: false` in returned RN objects |
| `src/lib/recommend.ts` | Modify | Filter out locked RNs from eligible candidates |
| `src/state/ShiftContext.tsx` | Modify | Add `TOGGLE_LOCK` action; update `SET_RN_COUNT` to default `locked: false` |
| `src/components/RnCard.tsx` | Modify | Add lock toggle button to header, dim card when locked |
| `src/components/AdmissionModal.tsx` | Modify | Add RN lock toggle section above room picker |
| `src/pages/Assignments.tsx` | Modify | Remove re-distribute button; add discharge to move sheet |
| `tests/recommend.test.ts` | Modify | Update `buildState` helper; add locked-RN tests |
| `tests/e2e/smoke.spec.ts` | Modify | Add lock and discharge test cases |

---

## Task 1: Add `locked` field to RN type and update all usages

This task adds the data field and ensures existing code compiles. No behavioral change yet.

**Files:**
- Modify: `src/lib/types.ts:14-17`
- Modify: `src/lib/distribute.ts:19-22,36-39`
- Modify: `src/state/ShiftContext.tsx:8-15,29,82-88`
- Modify: `tests/recommend.test.ts:23`

- [ ] **Step 1.1: Add `locked` to the RN interface in types.ts**

In `src/lib/types.ts`, replace:

```ts
export interface RN {
  id: number;              // 0-based; displayed as RN{id+1}
  assignedRooms: number[]; // room numbers
}
```

with:

```ts
export interface RN {
  id: number;              // 0-based; displayed as RN{id+1}
  assignedRooms: number[]; // room numbers
  locked: boolean;         // true = frozen (keeps rooms, skipped for new patients)
}
```

- [ ] **Step 1.2: Update distribute.ts to include `locked: false`**

In `src/lib/distribute.ts`, replace the `emptyRns` construction (lines 19-22):

```ts
  const emptyRns: RN[] = Array.from({ length: rnCount }, (_, id) => ({
    id,
    assignedRooms: [],
  }));
```

with:

```ts
  const emptyRns: RN[] = Array.from({ length: rnCount }, (_, id) => ({
    id,
    assignedRooms: [],
    locked: false,
  }));
```

And replace the return statement (lines 36-39):

```ts
  return chunks.map((chunk, id) => ({
    id,
    assignedRooms: chunk.map((r) => r.number),
  }));
```

with:

```ts
  return chunks.map((chunk, id) => ({
    id,
    assignedRooms: chunk.map((r) => r.number),
    locked: false,
  }));
```

- [ ] **Step 1.3: Add TOGGLE_LOCK action and update SET_RN_COUNT in ShiftContext.tsx**

In `src/state/ShiftContext.tsx`, replace the `Action` type (lines 8-15):

```ts
type Action =
  | { type: 'SET_RATIO'; value: number }
  | { type: 'SET_RN_COUNT'; value: number }
  | { type: 'SET_CRITICALITY'; room: number; level: Criticality | null }
  | { type: 'DISTRIBUTE' }
  | { type: 'MOVE_ROOM'; room: number; toRnId: number }
  | { type: 'NEW_SHIFT' }
  | { type: 'LOAD'; state: ShiftState };
```

with:

```ts
type Action =
  | { type: 'SET_RATIO'; value: number }
  | { type: 'SET_RN_COUNT'; value: number }
  | { type: 'SET_CRITICALITY'; room: number; level: Criticality | null }
  | { type: 'DISTRIBUTE' }
  | { type: 'MOVE_ROOM'; room: number; toRnId: number }
  | { type: 'TOGGLE_LOCK'; rnId: number }
  | { type: 'NEW_SHIFT' }
  | { type: 'LOAD'; state: ShiftState };
```

In the `SET_RN_COUNT` case (line 29), replace:

```ts
        return existing ?? { id, assignedRooms: [] };
```

with:

```ts
        return existing ?? { id, assignedRooms: [], locked: false };
```

Add the `TOGGLE_LOCK` case after the `MOVE_ROOM` case (before `NEW_SHIFT`):

```ts
    case 'TOGGLE_LOCK': {
      const rns = state.rns.map((rn) =>
        rn.id === action.rnId ? { ...rn, locked: !rn.locked } : rn
      );
      return { ...state, rns };
    }
```

- [ ] **Step 1.4: Update buildState helper in recommend.test.ts**

In `tests/recommend.test.ts`, replace line 23:

```ts
    return { id, assignedRooms: nums };
```

with:

```ts
    return { id, assignedRooms: nums, locked: false };
```

- [ ] **Step 1.5: Verify all tests pass and lint is clean**

Run: `npm test -- --run && npm run lint`
Expected: 34 tests pass, no type errors. No behavioral change — all existing tests should still pass as-is.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/types.ts src/lib/distribute.ts src/state/ShiftContext.tsx tests/recommend.test.ts
git commit -m "feat(types): add locked field to RN, add TOGGLE_LOCK reducer action"
```

---

## Task 2: Filter locked RNs from admission recommendations (TDD)

**Files:**
- Modify: `tests/recommend.test.ts`
- Modify: `src/lib/recommend.ts:14-16`

- [ ] **Step 2.1: Write failing tests for locked RN filtering**

In `tests/recommend.test.ts`, add these two tests inside the existing `describe('recommend', ...)` block, after the last `it(...)`:

```ts
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
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npm test -- --run`
Expected: 2 new tests FAIL (locked RNs are not yet filtered). The existing 34 tests still pass.

- [ ] **Step 2.3: Implement locked filter in recommend.ts**

In `src/lib/recommend.ts`, replace the eligible filter (lines 14-16):

```ts
  const eligible = state.rns.filter(
    (rn) => rn.assignedRooms.length < state.ratio
  );
```

with:

```ts
  const eligible = state.rns.filter(
    (rn) => !rn.locked && rn.assignedRooms.length < state.ratio
  );
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npm test -- --run`
Expected: all 36 tests pass (34 existing + 2 new).

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/recommend.ts tests/recommend.test.ts
git commit -m "feat(recommend): filter out locked RNs from admission suggestions"
```

---

## Task 3: Add lock toggle to RnCard component

**Files:**
- Modify: `src/components/RnCard.tsx`

- [ ] **Step 3.1: Replace src/components/RnCard.tsx**

Replace the entire file with:

```tsx
import { RN, Room, SCORE } from '../lib/types';

interface Props {
  rn: RN;
  rooms: Room[];
  onRoomTap?: (roomNumber: number) => void;
  onToggleLock?: () => void;
}

export default function RnCard({ rn, rooms, onRoomTap, onToggleLock }: Props) {
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
        opacity: rn.locked ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <strong>RN{rn.id + 1}</strong>
          {onToggleLock && (
            <button
              onClick={onToggleLock}
              aria-label={rn.locked ? `Unlock RN ${rn.id + 1}` : `Lock RN ${rn.id + 1}`}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                fontWeight: 600,
                background: rn.locked ? 'var(--danger)' : 'var(--bg)',
                color: rn.locked ? '#fff' : 'var(--text-muted)',
                border: rn.locked ? 'none' : '1px solid var(--border)',
              }}
            >
              {rn.locked ? 'Locked' : 'Lock'}
            </button>
          )}
        </div>
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

- [ ] **Step 3.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3.3: Commit**

```bash
git add src/components/RnCard.tsx
git commit -m "feat(RnCard): add lock toggle with visual dimming when locked"
```

---

## Task 4: Update Assignments page — remove re-distribute, add discharge, wire locks

**Files:**
- Modify: `src/pages/Assignments.tsx`

- [ ] **Step 4.1: Replace src/pages/Assignments.tsx**

Replace the entire file with:

```tsx
import { useState } from 'react';
import { useShift, workloadScore } from '../state/ShiftContext';
import FloorMap from '../components/FloorMap';
import RnCard from '../components/RnCard';
import BottomSheet from '../components/BottomSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import AdmissionModal from '../components/AdmissionModal';

type Tab = 'list' | 'map';

export default function Assignments() {
  const { state, dispatch } = useShift();
  const [tab, setTab] = useState<Tab>('list');
  const [movingRoom, setMovingRoom] = useState<number | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);

  const hasAssignments = state.rns.some((rn) => rn.assignedRooms.length > 0);

  const handleDischarge = () => {
    if (movingRoom !== null) {
      dispatch({ type: 'SET_CRITICALITY', room: movingRoom, level: null });
    }
    setConfirmDischarge(false);
    setMovingRoom(null);
  };

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
              onToggleLock={() => dispatch({ type: 'TOGGLE_LOCK', rnId: rn.id })}
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
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => setAdmissionOpen(true)}
        >
          + Admission
        </button>
      </div>

      {/* Move / Discharge sheet */}
      <BottomSheet
        open={movingRoom !== null && !confirmDischarge}
        title={movingRoom !== null ? `Room ${movingRoom}` : 'Room'}
        onClose={() => setMovingRoom(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="label">Move to...</div>
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
          <div
            style={{
              borderTop: '1px solid var(--divider)',
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-3)',
            }}
          >
            <button
              className="btn btn-danger"
              style={{ width: '100%' }}
              onClick={() => setConfirmDischarge(true)}
            >
              Discharge
            </button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDischarge}
        title={`Discharge Room ${movingRoom}`}
        message="This will remove the patient and mark the room as empty."
        confirmLabel="Discharge"
        destructive
        onCancel={() => setConfirmDischarge(false)}
        onConfirm={handleDischarge}
      />

      <AdmissionModal
        open={admissionOpen}
        onClose={() => setAdmissionOpen(false)}
      />
    </>
  );
}
```

Key changes from original:
1. **Removed** the `Re-distribute` button from the sticky footer — footer now has only `+ Admission` at full width.
2. **Added** `confirmDischarge` state and `handleDischarge()` handler.
3. **Added** `onToggleLock` prop on each `RnCard` dispatching `TOGGLE_LOCK`.
4. **Added** `ConfirmDialog` import and a destructive discharge confirmation.
5. **Move sheet** now has a "Discharge" button below a divider, and its `open` prop excludes when the confirm is showing (`movingRoom !== null && !confirmDischarge`).
6. **Move sheet title** changed from `Move Room ${movingRoom} to…` to `Room ${movingRoom}` since the sheet now serves two purposes (move and discharge).

- [ ] **Step 4.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/Assignments.tsx
git commit -m "feat(Assignments): remove re-distribute, add discharge with confirm, wire lock toggles"
```

---

## Task 5: Add lock toggles to AdmissionModal

**Files:**
- Modify: `src/components/AdmissionModal.tsx`

- [ ] **Step 5.1: Replace src/components/AdmissionModal.tsx**

Replace the entire file with:

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
        {/* RN lock toggles */}
        {state.rns.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
              RN Availability
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {state.rns.map((rn) => (
                <button
                  key={rn.id}
                  onClick={() => dispatch({ type: 'TOGGLE_LOCK', rnId: rn.id })}
                  aria-label={
                    rn.locked
                      ? `Unlock RN ${rn.id + 1}`
                      : `Lock RN ${rn.id + 1}`
                  }
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    background: rn.locked ? 'var(--danger)' : 'var(--bg)',
                    color: rn.locked ? '#fff' : 'inherit',
                    border: rn.locked ? 'none' : '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  RN{rn.id + 1}{rn.locked ? ' Locked' : ''}
                </button>
              ))}
            </div>
            {state.rns.some((rn) => rn.locked) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                Locked RNs won't appear in suggestions
              </div>
            )}
          </div>
        )}

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
                All RNs at capacity or locked. Consider unlocking an RN or increasing the ratio.
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

Key changes from original:
1. **Added** RN Availability section at the top with lock toggle buttons for each RN.
2. **Each toggle** dispatches `TOGGLE_LOCK` and shows "RN1 Locked" when locked (red background) or just "RN1" when unlocked.
3. **Helper text** appears when any RN is locked: "Locked RNs won't appear in suggestions".
4. **Empty suggestions message** updated to mention locked RNs alongside the capacity message.

- [ ] **Step 5.2: Type-check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 5.3: Commit**

```bash
git add src/components/AdmissionModal.tsx
git commit -m "feat(AdmissionModal): add RN lock toggles above room picker"
```

---

## Task 6: Update E2E smoke test

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 6.1: Update the existing happy-path test and add lock + discharge tests**

Replace the entire file with:

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

  // Re-distribute button should NOT exist (removed in this feature)
  await expect(page.getByRole('button', { name: 'Re-distribute' })).toHaveCount(0);

  // Open admission modal
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick an empty room and a level (921 should be empty)
  await page.getByRole('dialog').getByRole('button', { name: '921' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Suggestion should appear — tap the first one
  const firstSuggestion = page.getByRole('dialog').locator('button').filter({ hasText: /load/ }).first();
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

test('locked RN is excluded from admission suggestions', async ({ page }) => {
  await page.goto('/');

  // 2 RNs, 2 rooms
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();
  await rnCard.getByLabel('Increase RN count').click();

  await page.getByRole('link', { name: 'Census' }).click();
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();

  // Lock RN 1 via the card toggle
  await page.getByLabel('Lock RN 1').click();
  // Button should now say "Locked"
  await expect(page.getByLabel('Unlock RN 1')).toBeVisible();

  // Open admission, get suggestions
  await page.getByRole('button', { name: '+ Admission' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '919' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /medium/i }).click();
  await page.getByRole('button', { name: 'Find best RN' }).click();

  // Only RN2 should appear in suggestions (RN1 is locked)
  // Suggestion buttons contain "load" in the reason text
  const suggestionButtons = page.getByRole('dialog').locator('button').filter({ hasText: /load/ });
  await expect(suggestionButtons).toHaveCount(1);
  await expect(suggestionButtons.first()).toContainText('RN2');

  // Accept suggestion
  await suggestionButtons.first().click();
  await expect(page.getByText('919')).toBeVisible();
});

test('discharge removes patient from RN assignment', async ({ page }) => {
  await page.goto('/');

  // 1 RN, 2 rooms
  const rnCard = page.locator('.card').filter({ hasText: 'Available RNs' });
  await rnCard.getByLabel('Increase RN count').click();

  await page.getByRole('link', { name: 'Census' }).click();
  await page.getByRole('button', { name: /^915/ }).click();
  await page.getByRole('dialog').getByText('HIGH').first().click();
  await page.getByRole('button', { name: /^917/ }).click();
  await page.getByRole('dialog').getByText('MEDIUM').first().click();

  await page.getByRole('button', { name: /Distribute/ }).click();
  await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible();
  await expect(page.getByText('2 rooms')).toBeVisible();

  // Tap room 915 chip to open the room sheet
  await page.locator('button').filter({ hasText: '915' }).filter({ hasText: 'H' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Tap Discharge
  await page.getByRole('button', { name: 'Discharge' }).click();
  // Confirm discharge
  await page.getByRole('dialog').getByRole('button', { name: 'Discharge' }).click();

  // Should be down to 1 room
  await expect(page.getByText('1 rooms')).toBeVisible();
});
```

Key changes from the original test:
1. **Happy-path test** now verifies re-distribute button is absent, and uses `/load/` filter for suggestion buttons.
2. **New test: locked RN exclusion** — locks RN1, verifies only RN2 appears in suggestions.
3. **New test: discharge** — occupies 2 rooms, discharges one via the sheet, verifies room count drops.

- [ ] **Step 6.2: Run unit tests to confirm they still pass**

Run: `npm test -- --run`
Expected: 36 tests pass

- [ ] **Step 6.3: Run E2E tests**

Run: `npm run test:e2e`
Expected: 3 tests pass

- [ ] **Step 6.4: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test(e2e): add lock exclusion and discharge smoke tests"
```

---

## Done

After all 6 tasks:
- `locked` field persists on RN objects (via existing localStorage auto-save)
- Locked RNs are fully frozen: keep rooms, skipped by `recommend()`
- Lock toggles on RN cards (Assignments list) and in AdmissionModal
- Discharge option in the room sheet with destructive confirmation
- Re-distribute button removed from Assignments — no accidental reshuffling
- 36 unit tests pass (34 original + 2 new locked-filter tests)
- 3 E2E tests pass (updated happy-path + lock + discharge)
