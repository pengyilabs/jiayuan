import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import dicts from './dicts.js';

export const LANG_KEY = 'pp-lang';
export const LANG_IDS = ['zh', 'en', 'fr', 'es'];
export const LANG_LABELS = { zh: '简体', en: 'EN', fr: 'FR', es: 'ES' };
export const LANG_NAMES = { zh: '简体中文', en: 'English', fr: 'Français', es: 'Español' };

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && LANG_IDS.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    return 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const dict = Object.assign({}, dicts.en || {}, dicts[lang] || {});
    return {
      lang,
      setLang: (l) => {
        const next = LANG_IDS.indexOf(l) >= 0 ? l : 'en';
        try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
        setLangState(next);
      },
      t: (key) => (dict[key] !== undefined ? dict[key] : key)
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
