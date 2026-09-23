/** Store mínimo con suscripción por selector (sin dependencias). */

export type Listener<S> = (state: S, previous: S) => void;

export interface Store<S extends object> {
  getState(): S;
  setState(patch: Partial<S> | ((state: S) => Partial<S>)): void;
  subscribe(listener: Listener<S>): () => void;
  /** Llama a `callback` solo cuando cambia el valor seleccionado. */
  watch<T>(selector: (state: S) => T, callback: (value: T, previous: T) => void): () => void;
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<Listener<S>>();

  const subscribe: Store<S>['subscribe'] = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    getState: () => state,
    setState(patch) {
      const previous = state;
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      listeners.forEach(listener => {
        listener(state, previous);
      });
    },
    subscribe,
    watch: (selector, callback) =>
      subscribe((next, previous) => {
        const value = selector(next);
        const before = selector(previous);
        if (!Object.is(value, before)) callback(value, before);
      }),
  };
}
