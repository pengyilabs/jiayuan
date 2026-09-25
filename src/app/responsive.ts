/**
 * Puntos de corte (F7): móvil <640px, tablet 640–1023px, PC ≥1024px — los mismos umbrales que
 * usa el CSS (`styles/responsive.css`), para que el JS que depende del tamaño (calendario,
 * listado de propiedades, cajón de navegación) decida exactamente en los mismos límites.
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_MIN = 640;
const DESKTOP_MIN = 1024;

export function breakpointForWidth(width: number): Breakpoint {
  if (width < TABLET_MIN) return 'mobile';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

export function currentBreakpoint(): Breakpoint {
  return breakpointForWidth(window.innerWidth);
}

/**
 * Llama a `callback` con el punto de corte actual, y de nuevo cada vez que cambia (no en cada
 * evento `resize`: solo cuando se cruza uno de los dos umbrales). Devuelve una función para
 * dejar de escuchar.
 */
export function onBreakpointChange(callback: (breakpoint: Breakpoint) => void): () => void {
  let last = currentBreakpoint();
  const handler = (): void => {
    const next = currentBreakpoint();
    if (next !== last) {
      last = next;
      callback(next);
    }
  };
  window.addEventListener('resize', handler);
  callback(last);
  return () => {
    window.removeEventListener('resize', handler);
  };
}
