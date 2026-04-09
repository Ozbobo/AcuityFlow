import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShift, occupiedCount } from '../state/ShiftContext';
import { Criticality, Room } from '../lib/types';
import FloorMap from '../components/FloorMap';
import CriticalityPicker from '../components/CriticalityPicker';

type Tab = 'list' | 'map';

export default function Census() {
  const { state, dispatch } = useShift();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('list');
  const [picking, setPicking] = useState<Room | null>(null);

  const highHall = state.rooms.filter((r) => r.hall === 'high').sort((a, b) => a.number - b.number);
  const lowHall = state.rooms.filter((r) => r.hall === 'low').sort((a, b) => a.number - b.number);

  const total = occupiedCount(state);

  const setLevel = (room: Room, level: Criticality | null) => {
    dispatch({ type: 'SET_CRITICALITY', room: room.number, level });
  };

  return (
    <>
      <header className="page-header">
        <h2>Census</h2>
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

        {tab === 'list' ? (
          <>
            <HallList title="High Hall" rooms={highHall} onTap={setPicking} />
            <HallList title="Low Hall" rooms={lowHall} onTap={setPicking} />
          </>
        ) : (
          <FloorMap rooms={state.rooms} onRoomClick={setPicking} />
        )}

        <div style={{ height: 80 }} />
      </main>

      <div className="sticky-footer">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{total} occupied</div>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', width: 'auto', padding: '12px 20px' }}
          disabled={total === 0 || state.rnCount === 0}
          onClick={() => {
            dispatch({ type: 'DISTRIBUTE' });
            navigate('/assignments');
          }}
        >
          Distribute →
        </button>
      </div>

      <CriticalityPicker
        open={picking !== null}
        roomNumber={picking?.number ?? null}
        current={picking?.criticality ?? null}
        onClose={() => setPicking(null)}
        onPick={(level) => {
          if (picking) setLevel(picking, level);
        }}
      />
    </>
  );
}

function HallList({
  title,
  rooms,
  onTap,
}: {
  title: string;
  rooms: Room[];
  onTap: (room: Room) => void;
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-2)' }}>
      <div className="label" style={{ padding: 'var(--space-2)' }}>{title}</div>
      {rooms.map((r) => (
        <button
          key={r.number}
          onClick={() => onTap(r)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <strong>{r.number}</strong>
          {r.criticality ? (
            <span
              className={`chip chip-${r.criticality === 'medium' ? 'med' : r.criticality}`}
            >
              {r.criticality}
            </span>
          ) : (
            <span className="chip chip-empty">EMPTY</span>
          )}
        </button>
      ))}
    </div>
  );
}
