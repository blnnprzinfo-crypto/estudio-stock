import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMovement } from '../../db/movements.js';
import type { ID, MovementReason } from '../../types/index.js';

/** Cuánto se espera tras el último toque antes de escribir en la base. */
const COMMIT_DELAY_MS = 900;

/**
 * Motivo según la dirección del ajuste.
 *
 * Bajar es gasto: es lo que pasa de verdad cuando el material sale mientras se
 * tatúa. Subir se registra como 'ajuste' y no como 'compra' a propósito: desde
 * la lista no se sabe si ha entrado material nuevo o si se está corrigiendo un
 * recuento, y llamarlo compra metería un coste que no ha existido.
 */
const REASON_DOWN: MovementReason = 'uso';
const REASON_UP: MovementReason = 'ajuste';

interface UseStockStepperOptions {
  /** Se llama tras escribir en la base, para recargar la lista. */
  onCommitted: () => void | Promise<void>;
}

interface UseStockStepperResult {
  /** Diferencia aún sin escribir de cada producto. */
  pending: Map<ID, number>;
  error: string | null;
  adjust: (productId: ID, step: number, currentQty: number) => void;
  dismissError: () => void;
}

/**
 * Ajuste rápido de stock desde la lista, con +/-.
 *
 * Dos cosas que no son opcionales:
 *
 * Escribe SIEMPRE con applyMovement, que guarda la cantidad y su movimiento en
 * la misma transacción. Nunca toca product.qty por su cuenta, porque entonces
 * el stock y el historial dejarían de cuadrar.
 *
 * Agrupa los toques seguidos. Cinco toques al + son un movimiento de +5, no
 * cinco de +1: el historial se lee después, y un chorro de movimientos de una
 * unidad no cuenta nada. El número en pantalla se mueve al instante; la
 * escritura espera a que se pare de tocar.
 */
export function useStockStepper({
  onCommitted,
}: UseStockStepperOptions): UseStockStepperResult {
  const [pending, setPending] = useState<Map<ID, number>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // En refs porque los temporizadores los leen fuera del render.
  const pendingRef = useRef(new Map<ID, number>());
  const timersRef = useRef(new Map<ID, ReturnType<typeof setTimeout>>());
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;

  const commit = useCallback(async (productId: ID) => {
    const delta = pendingRef.current.get(productId) ?? 0;

    pendingRef.current.delete(productId);
    timersRef.current.delete(productId);
    setPending(new Map(pendingRef.current));

    if (delta === 0) return;

    try {
      await applyMovement({
        productId,
        delta,
        reason: delta < 0 ? REASON_DOWN : REASON_UP,
      });
      await onCommittedRef.current();
    } catch (cause) {
      // La cantidad en pantalla vuelve sola: el pendiente ya se ha soltado y
      // el producto se relee de la base.
      setError(
        cause instanceof Error ? cause.message : 'No se pudo guardar el ajuste'
      );
      await onCommittedRef.current();
    }
  }, []);

  const adjust = useCallback(
    (productId: ID, step: number, currentQty: number) => {
      const already = pendingRef.current.get(productId) ?? 0;
      const next = already + step;

      // El stock no puede quedar negativo. Se para aquí en vez de dejar que
      // applyMovement lo rechace después de que el número ya haya bajado.
      if (currentQty + next < 0) return;

      setError(null);
      pendingRef.current.set(productId, next);
      setPending(new Map(pendingRef.current));

      const running = timersRef.current.get(productId);
      if (running) clearTimeout(running);

      timersRef.current.set(
        productId,
        setTimeout(() => void commit(productId), COMMIT_DELAY_MS)
      );
    },
    [commit]
  );

  // Al salir de la pantalla se escribe lo que quede pendiente: si no, los
  // últimos toques se perderían sin avisar.
  useEffect(() => {
    const timers = timersRef.current;
    const pendingOnUnmount = pendingRef.current;

    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();

      for (const [productId, delta] of pendingOnUnmount) {
        if (delta === 0) continue;
        void applyMovement({
          productId,
          delta,
          reason: delta < 0 ? REASON_DOWN : REASON_UP,
        }).catch(() => {
          // La pantalla ya no existe; el siguiente reload muestra lo guardado.
        });
      }
      pendingOnUnmount.clear();
    };
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return { pending, error, adjust, dismissError };
}
