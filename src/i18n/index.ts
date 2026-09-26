import type { Lang, LocalizedText } from '../types/models';
import { getState } from '../app/state';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';

export type Dict = Readonly<Record<string, string | undefined>>;

export const LANGS: readonly Lang[] = ['zh', 'en', 'fr', 'es'];

const dictionaries: Record<Lang, Dict> = { zh, en, fr, es };

export function getDictionary(lang: Lang): Dict {
  return dictionaries[lang];
}

/** Diccionario del idioma activo. */
export function dict(): Dict {
  return dictionaries[getState().lang];
}

/** Traducción de `key` en el idioma activo; si no existe devuelve `fallback` o la propia clave. */
export function t(key: string, fallback?: string): string {
  return dict()[key] || fallback || key;
}

/**
 * Resuelve un texto traducible con la cadena de fallback: idioma solicitado → inglés → chino →
 * cualquier otro disponible. Devuelve `''` si no hay ninguno.
 */
export function localize(text: LocalizedText | null | undefined, lang: Lang): string {
  if (!text) return '';
  return text[lang] ?? text.en ?? text.zh ?? Object.values(text).find(Boolean) ?? '';
}

/** Aplica traducciones a los elementos `data-i18n` y `data-i18n-placeholder`. */
export function applyStaticI18n(root: ParentNode = document): void {
  const current = dict();
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const value = current[el.dataset.i18n ?? ''];
    if (value) el.textContent = value;
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    const value = current[el.dataset.i18nPlaceholder ?? ''];
    if (value) el.placeholder = value;
  });
}
