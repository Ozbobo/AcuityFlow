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
