/** Helpers de DOM tipados. */

export function getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function mustGetById<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = getById<T>(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado`);
  return el;
}

export function qs<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

export function qsa<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** `event.target` como Element (los nodos de texto no son destino de eventos de puntero). */
export function targetElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}
