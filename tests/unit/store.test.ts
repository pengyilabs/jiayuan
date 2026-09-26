import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/app/store';

describe('createStore', () => {
  it('actualiza con objeto o función', () => {
    const store = createStore({ a: 1, b: 'x' });
    store.setState({ a: 2 });
    store.setState(s => ({ b: `${s.b}y` }));
    expect(store.getState()).toEqual({ a: 2, b: 'xy' });
  });

  it('watch solo notifica cuando cambia el valor seleccionado', () => {
    const store = createStore({ a: 1, b: 1 });
    const spy = vi.fn();
    store.watch(s => s.a, spy);
    store.setState({ b: 2 });
    store.setState({ a: 1 });
    expect(spy).not.toHaveBeenCalled();
    store.setState({ a: 5 });
    expect(spy).toHaveBeenCalledExactlyOnceWith(5, 1);
  });

  it('permite cancelar la suscripción', () => {
    const store = createStore({ a: 1 });
    const spy = vi.fn();
    const unsubscribe = store.subscribe(spy);
    unsubscribe();
    store.setState({ a: 2 });
    expect(spy).not.toHaveBeenCalled();
  });
});
