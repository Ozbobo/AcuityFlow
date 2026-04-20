import { useState } from 'react';
import { useShift, occupiedCount, criticalityCounts } from '../state/ShiftContext';
import { MIN_RATIO, MAX_RATIO } from '../state/initialState';
import { Room } from '../lib/types';
import BottomSheet from './BottomSheet';
import CriticalityPicker from './CriticalityPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ShiftSettings({ open, onClose }: Props) {
  const { state, dispatch } = useShift();
  const [picking, setPicking] = useState<Room | null>(null);

  const total = occupiedCount(state);
  const counts = criticalityCounts(state);

  return (
    <>
      <BottomSheet open={open && picking === null} title="Edit Shift" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
              Available RNs
            </div>
            <div className="stepper">
              <button
                onClick={() =>
                  dispatch({ type: 'SET_RN_COUNT', value: Math.max(0, state.rnCount - 1) })
                }
                aria-label="Decrease RN count"
              >
                −
              </button>
              <div className="val">{state.rnCount}</div>
              <button
                onClick={() => dispatch({ type: 'SET_RN_COUNT', value: state.rnCount + 1 })}
                aria-label="Increase RN count"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
              Ratio (patients per RN)
            </div>
            <div className="stepper">
              <button
                onClick={() =>
                  dispatch({ type: 'SET_RATIO', value: Math.max(MIN_RATIO, state.ratio - 1) })
                }
                aria-label="Decrease ratio"
              >
                −
              </button>
              <div className="val">{state.ratio}</div>
              <button
                onClick={() =>
                  dispatch({ type: 'SET_RATIO', value: Math.min(MAX_RATIO, state.ratio + 1) })
                }
                aria-label="Increase ratio"
              >
                +
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                max {MAX_RATIO}
              </span>
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>
              Census — tap rooms to change acuity
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 'var(--space-2)',
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {[...state.rooms].sort((a, b) => a.number - b.number).map((r) => {
                const chipClass = r.criticality
                  ? `chip-${r.criticality === 'medium' ? 'med' : r.criticality}`
                  : 'chip-empty';
                return (
                  <button
                    key={r.number}
                    onClick={() => setPicking(r)}
                    style={{
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontWeight: 700,
                      fontSize: 12,
                      textAlign: 'center',
                    }}
                  >
                    <div>{r.number}</div>
                    <span className={`chip ${chipClass}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                      {r.criticality ? r.criticality[0].toUpperCase() : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 'var(--space-2)',
                display: 'flex',
                gap: 'var(--space-2)',
                flexWrap: 'wrap',
              }}
            >
              <span className="chip chip-high">{counts.high} HIGH</span>
              <span className="chip chip-med">{counts.medium} MED</span>
              <span className="chip chip-low">{counts.low} LOW</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: 13 }}>
                {total} occupied
              </span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </BottomSheet>

      <CriticalityPicker
        open={picking !== null}
        roomNumber={picking?.number ?? null}
        current={picking?.criticality ?? null}
        onClose={() => setPicking(null)}
        onPick={(level) => {
          if (picking) {
            dispatch({ type: 'SET_CRITICALITY', room: picking.number, level });
          }
        }}
      />
    </>
  );
}
