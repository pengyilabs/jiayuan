import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  breakpointForWidth,
  currentBreakpoint,
  onBreakpointChange,
} from '../../src/app/responsive';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
}

const originalWidth = window.innerWidth;
afterEach(() => {
  setWidth(originalWidth);
});

describe('breakpointForWidth', () => {
  it('clasifica los tres rangos en los umbrales exactos del plan', () => {
    expect(breakpointForWidth(320)).toBe('mobile');
    expect(breakpointForWidth(639)).toBe('mobile');
    expect(breakpointForWidth(640)).toBe('tablet');
    expect(breakpointForWidth(1023)).toBe('tablet');
    expect(breakpointForWidth(1024)).toBe('desktop');
    expect(breakpointForWidth(1920)).toBe('desktop');
  });
});

describe('currentBreakpoint', () => {
  it('lee window.innerWidth', () => {
    setWidth(375);
    expect(currentBreakpoint()).toBe('mobile');
    setWidth(1440);
    expect(currentBreakpoint()).toBe('desktop');
  });
});

describe('onBreakpointChange', () => {
  it('llama una vez de inmediato con el punto de corte actual', () => {
    setWidth(800);
    const cb = vi.fn();
    const stop = onBreakpointChange(cb);
    expect(cb).toHaveBeenCalledExactlyOnceWith('tablet');
    stop();
  });

  it('solo notifica cuando se cruza un umbral, no en cada resize', () => {
    setWidth(800);
    const cb = vi.fn();
    const stop = onBreakpointChange(cb);
    cb.mockClear();

    setWidth(900); // sigue siendo tablet
    window.dispatchEvent(new Event('resize'));
    expect(cb).not.toHaveBeenCalled();

    setWidth(1200); // cruza a desktop
    window.dispatchEvent(new Event('resize'));
    expect(cb).toHaveBeenCalledExactlyOnceWith('desktop');

    stop();
  });

  it('la función devuelta deja de escuchar', () => {
    setWidth(800);
    const cb = vi.fn();
    const stop = onBreakpointChange(cb);
    cb.mockClear();
    stop();

    setWidth(320);
    window.dispatchEvent(new Event('resize'));
    expect(cb).not.toHaveBeenCalled();
  });
});
