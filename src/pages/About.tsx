import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift } from '../state/ShiftContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function About() {
  const { newShift } = useShift();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <header className="page-header">
        <h2>About</h2>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </header>
      <main className="page">
        <div className="card">
          <div className="label">Version</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Charge Nurse Assigner 0.1.0</div>
        </div>
        <div className="card">
          <div className="label">How the math works</div>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            High patients count as 3, medium as 2, and low as 1. The app splits the floor into
            contiguous zones where each RN has a similar total score. When you add an admission,
            the top 3 RNs are the ones that are nearest to the new room, have the lightest load,
            and keep the criticality mix balanced — while staying under the ratio cap.
          </p>
        </div>
        <button
          className="btn btn-danger"
          style={{ width: '100%' }}
          onClick={() => setConfirm(true)}
        >
          Clear all data
        </button>
      </main>

      <ConfirmDialog
        open={confirm}
        title="Clear all data"
        message="This wipes every patient, RN, and assignment. Continue?"
        confirmLabel="Clear"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          newShift();
          setConfirm(false);
          navigate('/rns');
        }}
      />
    </>
  );
}
