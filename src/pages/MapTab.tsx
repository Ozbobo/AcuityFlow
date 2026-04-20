import { useState } from 'react';
import { useShift } from '../state/ShiftContext';
import { Room } from '../lib/types';
import FloorMap from '../components/FloorMap';
import ActionPicker from '../components/ActionPicker';
import AdmissionModal from '../components/AdmissionModal';
import ShiftSettings from '../components/ShiftSettings';

export default function MapTab() {
  const { state } = useShift();
  const [actionRoom, setActionRoom] = useState<Room | null>(null);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionRoom, setAdmissionRoom] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleRoomClick = (room: Room) => {
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
        <h2>Map</h2>
        <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
          ⚙ Edit
        </button>
      </header>

      <main className="page">
        <FloorMap
          rooms={state.rooms}
          onRoomClick={handleRoomClick}
          showLegend
          rnCount={state.rnCount}
        />
      </main>

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
