import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShiftProvider } from './state/ShiftContext';
import BottomNav from './components/BottomNav';
import Setup from './pages/Setup';
import Census from './pages/Census';
import Assignments from './pages/Assignments';
import About from './pages/About';

export default function App() {
  return (
    <ShiftProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<Setup />} />
            <Route path="/census" element={<Census />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ShiftProvider>
  );
}
