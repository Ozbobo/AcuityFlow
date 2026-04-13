import { useState } from 'react';
import { useShift, workloadScore } from '../state/ShiftContext';
import { Room } from '../lib/types';
import BottomSheet from './BottomSheet';
import CriticalityPicker from './CriticalityPicker';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  room: Room | null;
  onClose: () => void;
}

type SubAction = null | 'acuity' | 'move' | 'discharge';

export default function ActionPicker({ room, onClose }: Props) {
  const { state, dispatch } = useShift();
  const [sub, setSub] = useState<SubAction>(null);

  const close = () => {
    setSub(null);
    onClose();
  };

  const rn = room?.assignedTo !== null && room?.assignedTo !== undefined
    ? state.rns.find((r) => r.id === room.assignedTo)
    : null;

  const critLabel = room?.criticality
    ? room.criticality.toUpperCase()
    : 'EMPTY';

  const rnLabel = rn ? `RN${rn.id + 1}` : 'Unassigned';

  // Main action picker
  if (sub === null) {
    return (
      <BottomSheet
        open={room !== null}
        title={room ? `Room ${room.number}` : 'Room'}
        onClose={close}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          {critLabel} · {rnLabel}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <button
            onClick={() => setSub('acuity')}
            style={{
              flex: 1,
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 'var(--space-1)' }}>●</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Change Acuity</div>
          </button>
          <button
            onClick={() => setSub('move')}
            style={{
              flex: 1,
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 'var(--space-1)' }}>↔</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Move RN</div>
          </button>
        </div>
        <button
          onClick={() => setSub('discharge')}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius)',
            background: 'var(--danger)',
            color: 'var(--danger-contrast)',
            fontWeight: 600,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          Discharge
        </button>
      </BottomSheet>
    );
  }

  // Sub-action: Change Acuity
  if (sub === 'acuity') {
    return (
      <CriticalityPicker
        open
        roomNumber={room?.number ?? null}
        current={room?.criticality ?? null}
        onClose={close}
        onPick={(level) => {
          if (room) {
            dispatch({ type: 'SET_CRITICALITY', room: room.number, level });
          }
          close();
        }}
      />
    );
  }

  // Sub-action: Move RN
  if (sub === 'move') {
    return (
      <BottomSheet
        open
        title={room ? `Move Room ${room.number}` : 'Move'}
        onClose={close}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {state.rns.map((rnItem) => {
            const score = workloadScore(rnItem, state);
            const already = room !== null && rnItem.assignedRooms.includes(room.number);
            return (
              <button
                key={rnItem.id}
                disabled={already}
                onClick={() => {
                  if (room) {
                    dispatch({ type: 'MOVE_ROOM', room: room.number, toRnId: rnItem.id });
                  }
                  close();
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  borderLeft: `4px solid var(--rn-${rnItem.id % 6})`,
                  opacity: already ? 0.4 : 1,
                }}
              >
                <strong>RN{rnItem.id + 1}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {rnItem.assignedRooms.length} rooms · score {score}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    );
  }

  // Sub-action: Discharge
  return (
    <ConfirmDialog
      open
      title={`Discharge Room ${room?.number}`}
      message="This will remove the patient and mark the room as empty."
      confirmLabel="Discharge"
      destructive
      onCancel={close}
      onConfirm={() => {
        if (room) {
          dispatch({ type: 'SET_CRITICALITY', room: room.number, level: null });
        }
        close();
      }}
    />
  );
}
