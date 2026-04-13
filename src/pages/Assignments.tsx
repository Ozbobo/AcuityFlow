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
