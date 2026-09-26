import { registerActions } from '../../app/actions';
import { store } from '../../app/state';
import { getById, qsa } from '../../core/dom';
import { t } from '../../i18n';
import { showNotice } from '../../ui/toast';
import { renderPlatformCards } from './platform-cards';
import { renderAllPlatformFormats, renderCrossPlatformGrid } from './post-types';

function renderSettings(): void {
  renderPlatformCards();
  renderCrossPlatformGrid();
  renderAllPlatformFormats();
}

export function initSettings(): void {
  registerActions({
    'settings:tab': el => {
      qsa('.settings-tab').forEach(tab => tab.classList.remove('active'));
      qsa('.settings-tab-panel').forEach(panel => panel.classList.remove('active'));
      el.classList.add('active');
      getById(`settings-panel-${el.dataset.tab ?? ''}`)?.classList.add('active');
    },
    'settings:connect-platform': () => {
      showNotice(t('notice_feature_wip'));
    },
  });

  store.watch(s => s.lang, renderSettings);
  store.watch(s => s.platforms, renderSettings);
  renderSettings();
}
