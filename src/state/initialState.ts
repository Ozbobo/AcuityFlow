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
    distributed: false,
  };
}
