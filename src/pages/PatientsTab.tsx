import { useState } from 'react';
import { useShift } from '../state/ShiftContext';
import { Room } from '../lib/types';
import ActionPicker from '../components/ActionPicker';
import AdmissionModal from '../components/AdmissionModal';
import ShiftSettings from '../components/ShiftSettings';

export default function PatientsTab() {
  const { state } = useShift();
  const [actionRoom, setActionRoom] = useState<Room | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionRoom, setAdmissionRoom] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
          ⚙ Edit
        </button>
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

      <ShiftSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
