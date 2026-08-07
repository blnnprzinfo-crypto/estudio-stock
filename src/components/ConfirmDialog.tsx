import { useEffect } from 'react';
import { Button } from './Button.js';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación. Se cierra con Escape y pulsando fuera. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="grid w-full max-w-[420px] gap-3 rounded-xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[17px] font-bold">{title}</h2>
        <p className="text-[15px] leading-snug text-muted">{message}</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
