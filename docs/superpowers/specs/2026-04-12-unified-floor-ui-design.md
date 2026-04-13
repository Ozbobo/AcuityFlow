# Unified Floor UI Design

## Summary

Consolidate the app from 4 pages (Setup, Census, Assignments, About) with redundant map/list tabs into a streamlined 3-tab layout: **RNs**, **Map**, **Patients**. The current Setup and Census pages merge into a one-time Setup Wizard that appears at shift start and after "New Shift". Once distribution happens, the wizard disappears and mom works entirely within the 3-tab main app.

## Goals

- Eliminate redundant map/list views across Census and Assignments
- Reduce navigation complexity — mom shouldn't need to remember which page does what
- Keep the existing L-shaped FloorMap component (High Hall vertical, Nurse Station corner, Low Hall horizontal)
- Preserve all existing functionality: distribution, admission, locking, discharge, acuity editing, room moves

## Navigation Structure

### Bottom Nav (3 tabs)

| Tab | Route | Purpose |
|-----|-------|---------|
| RNs | `/rns` | RN list with lock toggles, ratio/occupied/empty summary, New Shift button |
| Map | `/map` | L-shaped floor map colored by RN assignment. Center tab. |
| Patients | `/patients` | Flat room list (room + acuity + assigned RN). Default landing after distribute. |

The About page remains accessible from the RNs tab header.

### Setup Wizard (overlay, not a tab)

A full-screen overlay that appears:
1. On first load when no shift data exists in localStorage
2. After tapping "New Shift" on the RNs tab

The wizard is **not** a route — it's a conditional overlay rendered in `App.tsx` based on the `distributed` boolean in state (see State Changes section). When `!state.distributed`, the wizard renders over the tab content.

## Pages Removed

- `src/pages/Setup.tsx` — replaced by Setup Wizard overlay
- `src/pages/Census.tsx` — census entry moves into the Setup Wizard; mid-shift acuity changes happen via the action picker on Map/Patients tabs

## Setup Wizard

### Content (single scrollable screen)

1. **Available RNs** — stepper (same as current Setup)
2. **Patient Ratio** — stepper (same as current Setup)
3. **Census** — room grid where tapping a room opens the CriticalityPicker. Shows occupied count and breakdown (H/M/L). Reuses existing CriticalityPicker component.
4. **Distribute button** — enabled when `occupiedCount > 0 && rnCount > 0`. Dispatches `DISTRIBUTE` and closes the wizard, landing on the Patients tab.

### Determining when to show the wizard

Add a boolean `distributed` field to `ShiftState`. Set to `true` when `DISTRIBUTE` fires, reset to `false` on `NEW_SHIFT`. The wizard shows when `!state.distributed`. This is cleaner than inferring from assignment state.

## Patients Tab

### Layout

A flat list of all occupied rooms, sorted by room number. Each row shows:

```
[ 915 ]  [ HIGH ]                    [ RN1 ]
[ 917 ]  [ MED  ]                    [ RN1 ]
[ 919 ]  [ LOW  ]        [ RN2 🔒 ]
[ 923 ]  [ EMPTY ]  (dimmed)         [ — ]
```

- Room number (bold, left)
- Acuity badge (colored: red/orange/green)
- Assigned RN pill (right, colored by RN index, shows lock icon if locked)
- Empty rooms shown dimmed at the bottom

### Interactions

- **Tap any occupied row** → opens the Action Picker sheet
- **Tap an empty row** → opens the Admission flow (same as tapping empty room on map)
- **Sticky footer** → "+ Admission" button (full width)

### Data source

`state.rooms.filter(r => r.occupied).sort((a,b) => a.number - b.number)` for occupied rows, then `state.rooms.filter(r => !r.occupied)` dimmed at the bottom. Each room's `assignedTo` maps to the RN display.

## RNs Tab

### Header

- Title: "RNs"
- Right side: "About" button (navigates to `/about`), "New Shift" button (opens ConfirmDialog, then resets state and shows wizard)

### Summary Bar

Three stat cards in a horizontal row:
- **Ratio**: `1:{state.ratio}`
- **Occupied**: `occupiedCount(state)`
- **Empty**: `totalRooms - occupiedCount(state)`

### RN List

One card per RN, same style as current RnCard but displayed here instead of on Assignments:
- RN name + lock toggle button
- Room count + workload score
- Room chips showing room number + acuity badge (tappable → action picker)
- Locked RNs dimmed at 0.6 opacity (same as current)

## Map Tab

### Layout

The existing `FloorMap` component, unchanged in layout. L-shape with High Hall (vertical, 8 rows of 2), Nurse Station corner, Low Hall (horizontal, 7 columns of 2).

Rooms colored by assigned RN (using existing `--rn-0` through `--rn-5` CSS variables). RN legend at the bottom showing lock status.

### Interactions

- **Tap an occupied room** → opens the Action Picker sheet
- **Tap an empty room** → opens the Admission flow directly (room pre-selected)

## Action Picker (bottom sheet)

When tapping an occupied room (from Map, Patients tab, or RN card chip), a bottom sheet appears with:

### Header
- Room number (e.g., "Room 915")
- Current status: "HIGH · RN1"

### Actions (3 buttons)
1. **Change Acuity** — closes ActionPicker, opens the existing CriticalityPicker for that room
2. **Move RN** — closes ActionPicker, opens a MoveSheet (list of RNs with room counts and workload scores, tap one to dispatch `MOVE_ROOM`). This is the same UI that currently lives in Assignments.tsx, extracted into ActionPicker's flow.
3. **Discharge** — closes ActionPicker, opens the existing ConfirmDialog (destructive confirmation, then `SET_CRITICALITY` with `null`)

This is a new component: `ActionPicker.tsx`. It replaces the direct-to-move-sheet behavior currently in Assignments.tsx.

## Admission Flow

Unchanged from current AdmissionModal behavior:
- RN availability toggles (lock/unlock)
- Empty room picker (grid)
- Criticality selector
- "Find best RN" → suggestions
- Tap suggestion to assign

Triggered from:
- "+ Admission" button in Patients tab footer
- Tapping an empty room on the Map (room pre-selected in the modal)
- Tapping an empty room row on the Patients tab (room pre-selected)

**Change**: When triggered from map/patient-list with a room pre-selected, skip the room picker step — show it already selected.

## State Changes

### New field: `distributed: boolean`

Added to `ShiftState` interface. Controls wizard visibility.

- `DISTRIBUTE` action: sets `distributed: true`
- `NEW_SHIFT` action: sets `distributed: false` (already resets to `createInitialState()`, which will now include `distributed: false`)
- `LOAD` action: preserved from localStorage (existing shifts already distributed will need migration — default `distributed: true` if `rns` have any `assignedRooms`)

### No other state changes

All existing actions (`SET_CRITICALITY`, `MOVE_ROOM`, `TOGGLE_LOCK`, `SET_RATIO`, `SET_RN_COUNT`) work as-is. The reducer doesn't change beyond adding `distributed`.

## Components Summary

| Component | Action |
|-----------|--------|
| `src/pages/Setup.tsx` | Delete (replaced by SetupWizard) |
| `src/pages/Census.tsx` | Delete (absorbed into SetupWizard + action picker) |
| `src/pages/Assignments.tsx` | Delete (replaced by Patients tab) |
| `src/pages/PatientsTab.tsx` | Create — flat room list with admission button |
| `src/pages/RnsTab.tsx` | Create — RN list with locks, summary stats, new shift |
| `src/pages/MapTab.tsx` | Create — FloorMap with action picker/admission on tap |
| `src/components/SetupWizard.tsx` | Create — full-screen overlay for shift start |
| `src/components/ActionPicker.tsx` | Create — bottom sheet with Change Acuity / Move RN / Discharge |
| `src/components/BottomNav.tsx` | Modify — 3 tabs: RNs, Map, Patients |
| `src/components/FloorMap.tsx` | No change (keep existing L-shape layout) |
| `src/components/RoomCell.tsx` | No change |
| `src/components/RnCard.tsx` | No change (reused in RNs tab) |
| `src/components/CriticalityPicker.tsx` | No change (reused in SetupWizard + ActionPicker) |
| `src/components/AdmissionModal.tsx` | Minor change — accept optional pre-selected room |
| `src/components/ConfirmDialog.tsx` | No change |
| `src/components/BottomSheet.tsx` | No change |
| `src/App.tsx` | Modify — new routes, conditional SetupWizard overlay |
| `src/state/ShiftContext.tsx` | Modify — add `distributed` field |
| `src/state/initialState.ts` | Modify — add `distributed: false` |
| `src/lib/types.ts` | Modify — add `distributed: boolean` to ShiftState |

## Testing

### Unit tests
- Existing 36 unit tests should continue passing (distribute, recommend, etc.)
- Add test for `distributed` flag toggling in reducer

### E2E tests
- Rewrite smoke test to match new flow: Setup Wizard → distribute → Patients tab → lock → admission → discharge
- Keep lock exclusion and discharge tests (adjust selectors for new UI)
