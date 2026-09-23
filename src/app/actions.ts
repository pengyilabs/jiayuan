/**
 * Delegación de eventos declarativa.
 *
 * El HTML declara `data-action="feature:accion"` (click) o `data-change="feature:accion"`
 * (change) y cada módulo registra su manejador. Sustituye a los atributos `onclick` inline.
 * El manejador se resuelve con `closest`, así el elemento más interno gana (equivale al
 * `event.stopPropagation()` que usaba el código original).
 *
 * Controles que no son nativamente enfocables (un `<div data-action>` con `tabindex="0"`, como
 * un elemento de navegación o una pestaña) activan igual con Enter/Espacio: se delega también
 * el teclado y se dispara el mismo `click()`. Los elementos nativos (`button`, `a`…) ya
 * responden solos al teclado, así que se ignoran aquí para no duplicar la activación.
 */
import { targetElement } from '../core/dom';

export type ActionHandler = (element: HTMLElement, event: Event) => void;
export type ActionMap = Readonly<Record<string, ActionHandler>>;

const clickActions = new Map<string, ActionHandler>();
const changeActions = new Map<string, ActionHandler>();

const NATIVELY_FOCUSABLE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']);

function register(target: Map<string, ActionHandler>, actions: ActionMap): void {
  for (const [name, handler] of Object.entries(actions)) {
    if (target.has(name)) throw new Error(`Acción duplicada: ${name}`);
    target.set(name, handler);
  }
}

export function registerActions(actions: ActionMap): void {
  register(clickActions, actions);
}

export function registerChangeActions(actions: ActionMap): void {
  register(changeActions, actions);
}

function dispatch(
  event: Event,
  attribute: 'action' | 'change',
  handlers: Map<string, ActionHandler>,
): void {
  const el = targetElement(event)?.closest<HTMLElement>(`[data-${attribute}]`);
  const name = el?.dataset[attribute];
  if (!el || !name) return;
  handlers.get(name)?.(el, event);
}

export function initActionDelegation(root: Document | HTMLElement = document): void {
  root.addEventListener('click', event => {
    dispatch(event, 'action', clickActions);
  });
  root.addEventListener('change', event => {
    dispatch(event, 'change', changeActions);
  });
  root.addEventListener('keydown', event => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    const el = targetElement(event)?.closest<HTMLElement>('[data-action][tabindex]');
    if (!el || NATIVELY_FOCUSABLE.has(el.tagName)) return;
    event.preventDefault();
    el.click();
  });
}
