import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startIdleTimer } from '../../src/features/auth/idle';
import { canAccess } from '../../src/features/auth/roles';

describe('roles', () => {
  it('el empleado no accede a aprobaciones ni ajustes', () => {
    expect(canAccess('employee', 'dashboard')).toBe(true);
    expect(canAccess('employee', 'listings')).toBe(true);
    expect(canAccess('employee', 'templates')).toBe(true);
    expect(canAccess('employee', 'approvals')).toBe(false);
    expect(canAccess('employee', 'settings')).toBe(false);
    expect(canAccess('admin', 'approvals')).toBe(true);
    expect(canAccess('admin', 'settings')).toBe(true);
  });
});

describe('temporizador de inactividad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cierra la sesión tras el periodo sin actividad y la actividad lo reinicia', () => {
    const onTimeout = vi.fn();
    const stop = startIdleTimer(onTimeout, 10_000);

    vi.advanceTimersByTime(9_000);
    window.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(9_000); // 18 s en total, pero solo 9 s desde la última actividad
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_100);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    stop();
  });

  it('al detenerlo ya no dispara', () => {
    const onTimeout = vi.fn();
    startIdleTimer(onTimeout, 5_000)();
    vi.advanceTimersByTime(60_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
