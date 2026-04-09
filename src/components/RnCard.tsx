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
