/**
 * Plantillas HTML seguras.
 *
 * `html` escapa por defecto todo valor interpolado; solo el contenido creado con `html`,
 * `raw` o `joinHtml` se inserta sin escapar. Elimina el riesgo de XSS de los `innerHTML`
 * construidos con template strings.
 */

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, ch => ESCAPES[ch] ?? ch);
}

/** Fragmento HTML de confianza (ya escapado o escrito por el desarrollador). */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export type Interpolation =
  SafeHtml | string | number | boolean | null | undefined | readonly Interpolation[];

function render(value: Interpolation): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

export function html(strings: TemplateStringsArray, ...values: Interpolation[]): SafeHtml {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? '');
  });
  return new SafeHtml(out);
}

/** Marca como seguro un string. Usar SOLO con contenido estático o de confianza (p. ej. SVG). */
export function raw(value: string): SafeHtml {
  return new SafeHtml(value);
}

/** Une fragmentos; los valores que no sean `SafeHtml` se escapan. */
export function joinHtml(items: readonly Interpolation[], separator = ''): SafeHtml {
  return new SafeHtml(items.map(render).join(separator));
}

export function setHtml(el: Element, content: SafeHtml): void {
  el.innerHTML = content.value;
}
