import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS, getDictionary, localize } from '../../src/i18n';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

describe('i18n', () => {
  it('los 4 idiomas tienen exactamente las mismas claves', () => {
    const [first, ...rest] = LANGS;
    const reference = Object.keys(getDictionary(first ?? 'en')).sort();
    for (const lang of rest) {
      expect(Object.keys(getDictionary(lang)).sort(), lang).toEqual(reference);
    }
  });

  it('ninguna traducción está vacía', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(getDictionary(lang))) {
        expect(value, `${lang}.${key}`).toBeTruthy();
      }
    }
  });

  it('todas las claves data-i18n de los fragmentos HTML existen en cada idioma', () => {
    const keys = new Set<string>();
    for (const file of htmlFiles(join(process.cwd(), 'src'))) {
      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) {
        if (match[1]) keys.add(match[1]);
      }
    }
    expect(keys.size).toBeGreaterThan(50);
    for (const lang of LANGS) {
      const dict = getDictionary(lang);
      const missing = [...keys].filter(key => !dict[key]);
      expect(missing, lang).toEqual([]);
    }
  });

  it('localize aplica la cadena idioma → en → zh → cualquiera', () => {
    const text = { zh: 'zh', en: 'en', fr: 'fr' };
    expect(localize(text, 'fr')).toBe('fr');
    expect(localize(text, 'es')).toBe('en');
    expect(localize({ zh: 'zh', fr: 'fr' }, 'es')).toBe('zh');
    expect(localize({ fr: 'fr' }, 'zh')).toBe('fr');
    expect(localize({}, 'en')).toBe('');
    expect(localize(null, 'en')).toBe('');
  });
});
