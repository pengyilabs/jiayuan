/** Comportamiento genérico de pestañas, chips, dropdowns de filtro e interruptores. */
import { registerActions } from '../app/actions';
import { qsa, targetElement } from '../core/dom';

function closeDropdowns(except?: Element): void {
  qsa('.filter-dropdown.open').forEach(dropdown => {
    if (dropdown !== except) dropdown.classList.remove('open');
  });
}

function setExclusiveActive(items: Element[], active: Element): void {
  items.forEach(item => item.classList.remove('active'));
  active.classList.add('active');
}

export function initFilters(): void {
  registerActions({
    'switch:toggle': el => {
      el.classList.toggle('on');
    },
  });

  document.addEventListener('click', event => {
    const target = targetElement(event);
    if (!target) return;

    // Tabs
    const tab = target.closest('.tabs .tab');
    if (tab?.parentElement) {
      setExclusiveActive(qsa('.tab', tab.parentElement), tab);
    }

    // Chips (solo dentro de .filter-group)
    const chip = target.closest('.filter-group .filter-chip');
    const group = chip?.closest('.filter-group');
    if (chip && group) setExclusiveActive(qsa('.filter-chip', group), chip);

    // Dropdowns de filtro
    const dropdown = target.closest('.filter-dropdown');
    if (!dropdown) {
      closeDropdowns();
      return;
    }
    const trigger = dropdown.querySelector('.filter-chip');
    const option = target.closest('.filter-option');
    if (option && trigger) {
      setExclusiveActive(qsa('.filter-option', dropdown), option);
      const svg = trigger.querySelector('svg')?.outerHTML ?? '';
      trigger.textContent = option.textContent;
      trigger.insertAdjacentHTML('beforeend', svg);
      dropdown.classList.remove('open');
    } else if (trigger?.contains(target)) {
      closeDropdowns(dropdown);
      dropdown.classList.toggle('open');
    }
  });
}
