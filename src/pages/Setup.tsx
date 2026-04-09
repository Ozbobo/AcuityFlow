import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useShift,
  occupiedCount,
  criticalityCounts,
  recommendedRnCount,
} from '../state/ShiftContext';
import { MIN_RATIO, MAX_RATIO } from '../state/initialState';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Setup() {
  const { state, dispatch, newShift } = useShift();
  const navigate = useNavigate();
  const [confirmNew, setConfirmNew] = useState(false);

  const total = occupiedCount(state);
  const counts = criticalityCounts(state);
  const recommended = recommendedRnCount(state);

  const canDistribute = total > 0 && state.rnCount > 0;
  const underStaffed = state.rnCount > 0 && state.rnCount < recommended;

  return (
    <>
      <header className="page-header">
        <h2>Shift Setup</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/about')}>
            About
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmNew(true)}>
            New Shift
          </button>
        </div>
      </header>

      <main className="page">
        <div className="card">
          <div className="label">Ratio (patients per RN)</div>
          <div className="stepper" style={{ marginTop: 'var(--space-2)' }}>
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

        <div className="card">
          <div className="label">Available RNs</div>
          <div className="stepper" style={{ marginTop: 'var(--space-2)' }}>
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
          {recommended > 0 && (
            <div
              style={{
                fontSize: 12,
                color: underStaffed ? 'var(--danger)' : 'var(--primary)',
                marginTop: 'var(--space-2)',
              }}
            >
              Recommended: {recommended} ({total} patients ÷ ratio {state.ratio})
              {underStaffed && ' — under-staffed'}
            </div>
          )}
        </div>

        <div className="card" style={{ background: '#eef5ff' }}>
          <div className="label">Census</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: 'var(--space-1) 0' }}>
            {total} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>patients</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span className="chip chip-high">{counts.high} HIGH</span>
            <span className="chip chip-med">{counts.medium} MED</span>
            <span className="chip chip-low">{counts.low} LOW</span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={!canDistribute}
          onClick={() => {
            dispatch({ type: 'DISTRIBUTE' });
            navigate('/assignments');
          }}
        >
          Distribute →
        </button>

        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 'var(--space-3)' }}
          onClick={() => navigate('/census')}
        >
          Edit Census →
        </button>
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
    </>
  );
}
