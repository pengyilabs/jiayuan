import { registerActions } from '../app/actions';
import { getState, setState, store } from '../app/state';
import { getById, qs, qsa, targetElement } from '../core/dom';
import type { Lang } from '../types/models';

const LABELS: Record<Lang, string> = { zh: '简体', en: 'EN', fr: 'FR', es: 'ES' };

function toggleDropdown(force?: boolean): void {
  getById('lang-dropdown')?.classList.toggle('open', force);
  getById('lang-trigger')?.classList.toggle('open', force);
}

function syncSelection(lang: Lang): void {
  qsa('.lang-option').forEach(option => {
    option.classList.toggle('active', option.dataset.lang === lang);
  });
  const current = getById('lang-current');
  if (current) current.textContent = LABELS[lang];
}

export function initLangSwitch(): void {
  registerActions({
    'lang:toggle': () => {
      toggleDropdown();
    },
    'lang:select': el => {
      setState({ lang: el.dataset.lang as Lang });
      toggleDropdown(false);
    },
  });

  document.addEventListener('click', event => {
    const switcher = qs('.lang-switch');
    if (switcher && !switcher.contains(targetElement(event))) toggleDropdown(false);
  });

  store.watch(s => s.lang, syncSelection);
  syncSelection(getState().lang);
}
