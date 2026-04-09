import { ReactNode, useEffect } from 'react';
import './BottomSheet.css';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  );
}
