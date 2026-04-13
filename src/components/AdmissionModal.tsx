import { useState, useMemo } from 'react';
import { useShift, emptyRooms } from '../state/ShiftContext';
import { Criticality, Suggestion } from '../lib/types';
import { recommend } from '../lib/recommend';
import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdmissionModal({ open, onClose }: Props) {
  const { state, dispatch } = useShift();
  const [roomNumber, setRoomNumber] = useState<number | null>(null);
  const [level, setLevel] = useState<Criticality | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const empties = useMemo(() => emptyRooms(state), [state]);

  const reset = () => {
    setRoomNumber(null);
    setLevel(null);
    setSuggestions(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const findBest = () => {
    if (roomNumber === null || level === null) return;
    const result = recommend(roomNumber, level, state);
    setSuggestions(result);
  };

  const assign = (rnId: number) => {
    if (roomNumber === null || level === null) return;
    dispatch({ type: 'SET_CRITICALITY', room: roomNumber, level });
    dispatch({ type: 'MOVE_ROOM', room: roomNumber, toRnId: rnId });
    close();
  };

  return (
    <BottomSheet open={open} title="New Admission" onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* RN lock toggles */}
        {state.rns.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
              RN Availability
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {state.rns.map((rn) => (
                <button
                  key={rn.id}
                  onClick={() => dispatch({ type: 'TOGGLE_LOCK', rnId: rn.id })}
                  aria-label={
                    rn.locked
                      ? `Unlock RN ${rn.id + 1}`
                      : `Lock RN ${rn.id + 1}`
                  }
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    background: rn.locked ? 'var(--danger)' : 'var(--bg)',
                    color: rn.locked ? '#fff' : 'inherit',
                    border: rn.locked ? 'none' : '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  RN{rn.id + 1}{rn.locked ? ' Locked' : ''}
                </button>
              ))}
            </div>
            {state.rns.some((rn) => rn.locked) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                Locked RNs won't appear in suggestions
              </div>
            )}
          </div>
        )}

        <div>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
            Room (empty rooms only)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-2)',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          >
            {empties.length === 0 && (
              <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)' }}>
                No empty rooms.
              </div>
            )}
            {empties.map((r) => (
              <button
                key={r.number}
                onClick={() => setRoomNumber(r.number)}
                style={{
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  background: roomNumber === r.number ? 'var(--primary)' : 'var(--bg)',
                  color: roomNumber === r.number ? 'var(--primary-contrast)' : 'inherit',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                }}
              >
                {r.number}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Criticality</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['high', 'medium', 'low'] as Criticality[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  border:
                    level === l ? '2px solid var(--primary)' : '2px solid transparent',
                  background:
                    l === 'high'
                      ? 'var(--crit-high-bg)'
                      : l === 'medium'
                      ? 'var(--crit-med-bg)'
                      : 'var(--crit-low-bg)',
                  color:
                    l === 'high'
                      ? 'var(--crit-high-fg)'
                      : l === 'medium'
                      ? 'var(--crit-med-fg)'
                      : 'var(--crit-low-fg)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={roomNumber === null || level === null}
          onClick={findBest}
        >
          Find best RN
        </button>

        {suggestions !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="label">Suggestions</div>
            {suggestions.length === 0 && (
              <div style={{ color: 'var(--danger)', fontSize: 13 }}>
                All RNs at capacity or locked. Consider unlocking an RN or increasing the ratio.
              </div>
            )}
            {suggestions.map((s) => (
              <button
                key={s.rnId}
                onClick={() => assign(s.rnId)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  borderLeft: `4px solid var(--rn-${s.rnId % 6})`,
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.reason}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
