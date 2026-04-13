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
