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
  | { type: 'TOGGLE_LOCK'; rnId: number }
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
        return existing ?? { id, assignedRooms: [], locked: false };
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
      return { ...state, rns, rooms, distributed: true };
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

    case 'TOGGLE_LOCK': {
      const rns = state.rns.map((rn) =>
        rn.id === action.rnId ? { ...rn, locked: !rn.locked } : rn
      );
      return { ...state, rns };
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
