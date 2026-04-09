import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <BottomSheet open={open} title={title} onClose={onCancel}>
      <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-muted)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
          style={{ flex: 1 }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
