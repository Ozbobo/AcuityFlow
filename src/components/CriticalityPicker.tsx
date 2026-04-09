import BottomSheet from './BottomSheet';
import { Criticality } from '../lib/types';

interface Props {
  open: boolean;
  roomNumber: number | null;
  current: Criticality | null;
  onPick: (level: Criticality | null) => void;
  onClose: () => void;
}

const options: { level: Criticality | null; label: string; className: string }[] = [
  { level: 'high', label: 'HIGH', className: 'chip-high' },
  { level: 'medium', label: 'MEDIUM', className: 'chip-med' },
  { level: 'low', label: 'LOW', className: 'chip-low' },
  { level: null, label: 'EMPTY', className: 'chip-empty' },
];

export default function CriticalityPicker({
  open,
  roomNumber,
  current,
  onPick,
  onClose,
}: Props) {
  return (
    <BottomSheet
      open={open}
      title={roomNumber !== null ? `Room ${roomNumber}` : 'Room'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {options.map((opt) => {
          const isCurrent = opt.level === current;
          return (
            <button
              key={opt.label}
              onClick={() => {
                onPick(opt.level);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg)',
                border: isCurrent ? '2px solid var(--primary)' : '2px solid transparent',
                minHeight: 56,
              }}
            >
              <span className={`chip ${opt.className}`}>{opt.label}</span>
              {isCurrent && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
