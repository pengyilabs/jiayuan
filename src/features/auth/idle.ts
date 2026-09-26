/** Cierra la sesión tras un periodo sin actividad del usuario. */

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Reinicia el temporizador con cada interacción (como mucho una vez por segundo).
 * Devuelve la función que lo detiene.
 */
export function startIdleTimer(onTimeout: () => void, timeoutMs = IDLE_TIMEOUT_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastReset = 0;

  const reset = (): void => {
    const now = Date.now();
    if (timer !== undefined && now - lastReset < 1000) return;
    lastReset = now;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(onTimeout, timeoutMs);
  };

  ACTIVITY_EVENTS.forEach(name => {
    window.addEventListener(name, reset, { passive: true });
  });
  reset();

  return () => {
    if (timer !== undefined) clearTimeout(timer);
    ACTIVITY_EVENTS.forEach(name => {
      window.removeEventListener(name, reset);
    });
  };
}
