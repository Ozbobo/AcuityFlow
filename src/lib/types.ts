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
  locked: boolean;         // true = frozen (keeps rooms, skipped for new patients)
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
