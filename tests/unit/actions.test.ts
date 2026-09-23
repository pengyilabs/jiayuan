import { describe, expect, it, vi } from 'vitest';
import {
  initActionDelegation,
  registerActions,
  registerChangeActions,
} from '../../src/app/actions';

describe('acciones delegadas', () => {
  it('resuelve el elemento más interno con data-action (equivale a stopPropagation)', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    registerActions({ 'test:outer': outer, 'test:inner': inner });
    initActionDelegation();

    document.body.innerHTML = `
      <div data-action="test:outer" id="row">
        <button data-action="test:inner" id="btn"><span id="icon"></span></button>
      </div>`;
    document.getElementById('icon')?.click();
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();

    document.getElementById('row')?.click();
    expect(outer).toHaveBeenCalledOnce();
  });

  it('gestiona eventos change con data-change', () => {
    const handler = vi.fn();
    registerChangeActions({ 'test:change': handler });
    document.body.innerHTML =
      '<select data-change="test:change" id="s"><option>1</option></select>';
    document.getElementById('s')?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('hace alcanzable por teclado un div[data-action tabindex] y activa con Enter/Espacio', () => {
    const handler = vi.fn();
    registerActions({ 'test:kbd': handler });
    document.body.innerHTML = '<div data-action="test:kbd" tabindex="0" id="row2">Fila</div>';

    const row = document.getElementById('row2');
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    row?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('no interfiere con controles nativos (ya responden solos al teclado)', () => {
    const handler = vi.fn();
    registerActions({ 'test:kbd2': handler });
    document.body.innerHTML = '<button data-action="test:kbd2" id="native"></button>';
    document
      .getElementById('native')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    // La delegación de teclado ignora los elementos nativos: no duplica la activación.
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignora Enter/Espacio en un div[data-action] sin tabindex (no es alcanzable por teclado)', () => {
    const handler = vi.fn();
    registerActions({ 'test:kbd3': handler });
    document.body.innerHTML = '<div data-action="test:kbd3" id="row3">Fila</div>';
    document
      .getElementById('row3')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('rechaza acciones duplicadas', () => {
    registerActions({ 'test:dup': () => undefined });
    expect(() => {
      registerActions({ 'test:dup': () => undefined });
    }).toThrow(/duplicada/);
  });
});
