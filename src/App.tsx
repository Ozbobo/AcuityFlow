import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShiftProvider, useShift } from './state/ShiftContext';
import BottomNav from './components/BottomNav';
import SetupWizard from './components/SetupWizard';
import MapTab from './pages/MapTab';
import PatientsTab from './pages/PatientsTab';
import RnsTab from './pages/RnsTab';
import About from './pages/About';

function AppShell() {
  const { state } = useShift();

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<MapTab />} />
        <Route path="/patients" element={<PatientsTab />} />
        <Route path="/rns" element={<RnsTab />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      {!state.distributed && <SetupWizard />}
    </div>
  );
}

export default function App() {
  return (
    <ShiftProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell />
      </BrowserRouter>
    </ShiftProvider>
  );
}
