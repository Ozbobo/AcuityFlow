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
