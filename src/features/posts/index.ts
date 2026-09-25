/**
 * Formulario de posts: crear (una fila por plataforma marcada, un post por fila), editar y
 * reenviar un post rechazado. Guarda como borrador o solicita aprobación directamente.
 */
import { registerActions, registerChangeActions } from '../../app/actions';
import { repos } from '../../app/services';
import { getState, setState } from '../../app/state';
import { getById, mustGetById } from '../../core/dom';
import { utcIsoToZonedInputValue, zonedTimeToUtcIso } from '../../core/dates';
import { POST_LANG_LABEL } from '../../data/mappers';
import {
  validateMediaFiles,
  validateImageRatios,
  validateVideoDuration,
} from '../../data/media-validation';
import type { MediaFile } from '../../data/media-validation';
import { exportTemplateAsPng } from '../templates/template-export';
import { t } from '../../i18n';
import { armDangerButton, showDialog } from '../../ui/dialog';
import { errorMessage } from '../../ui/errors';
import { withButtonLoading } from '../../ui/loading';
import { closeModal, onModalClose, openModal } from '../../ui/modal';
import { showToast } from '../../ui/toast';
import { listingTitle } from '../listings/listing-format';
import { findPlatform } from '../platforms/platform-format';
import type { Post, PostDraft, PostMedia, PostTypeGroup, PlatformId } from '../../types/models';
import type { Tables } from '../../types/db';
import { offerPostUndo } from './post-undo';
import {
  compatibleTemplates,
  emptyRow,
  openFilePicker,
  renderCharCount,
  renderListingOptions,
  renderMediaIssues,
  renderPlatformChecks,
  renderPlatformRows,
  revokeRowPreviews,
} from './post-form';
import type { FormState, RowState } from './post-form';

/** Modal de detalle de un listing (F1): la apertura del formulario de post la sustituye. */
const LISTING_MODAL_ID = 'modal-listing-detail';
const POST_MODAL_ID = 'modal-post';

let form: FormState | null = null;

const readListingId = (): number | null => {
  const raw = getById<HTMLSelectElement>('post-listing')?.value ?? '';
  return raw === '' ? null : Number(raw);
};
const readTitle = (): string => getById<HTMLInputElement>('post-title')?.value.trim() ?? '';
const readLangCode = (): Tables<'posts'>['lang'] =>
  (getById<HTMLSelectElement>('post-lang')?.value as Tables<'posts'>['lang'] | undefined) ?? 'zh';
const readContent = (): string => getById<HTMLTextAreaElement>('post-content')?.value ?? '';
const readHashtags = (): string => getById<HTMLInputElement>('post-hashtags')?.value.trim() ?? '';
const readSchedule = (): string => getById<HTMLInputElement>('post-schedule')?.value ?? '';

function showFormError(message: string | null): void {
  const box = getById('post-error');
  if (!box) return;
  box.hidden = message === null;
  box.textContent = message ?? '';
}

function updateCharCount(): void {
  if (!form) return;
  renderCharCount(readContent(), POST_LANG_LABEL[readLangCode()], form.rows);
}

function currentRow(platformId: PlatformId): RowState | undefined {
  return form?.rows.find(r => r.platformId === platformId);
}

function refreshRows(): void {
  if (!form) return;
  renderPlatformRows(form.rows, readListingId());
  updateCharCount();
}

/** Prepara y abre el formulario vacío. `listingId` lo pasa "Nueva publicación" de un listing. */
function openCreate(listingId: number | null, preferredTemplateId: number | null = null): void {
  const preferredVariant = preferredTemplateId
    ? getState().templates.find(t => t.id === preferredTemplateId)?.variants[0]
    : undefined;

  form = {
    mode: 'create',
    postId: null,
    rejectionReason: null,
    rows: preferredVariant
      ? [
          {
            ...emptyRow(preferredVariant.platformId),
            postTypeId: preferredVariant.postTypeId,
            templateId: preferredTemplateId,
          },
        ]
      : [],
  };
  showFormError(null);
  getById('post-rejected-hint')?.setAttribute('hidden', '');

  const titleEl = getById<HTMLElement>('post-modal-title');
  if (titleEl) titleEl.textContent = t('post_form_new');
  getById('post-platform-picker')?.removeAttribute('hidden');

  mustGetById<HTMLInputElement>('post-title').value = '';
  mustGetById<HTMLTextAreaElement>('post-content').value = '';
  mustGetById<HTMLInputElement>('post-hashtags').value = '';
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  mustGetById<HTMLInputElement>('post-schedule').value = utcIsoToZonedInputValue(
    inOneHour,
    getState().settings.timezone,
  );

  renderListingOptions(listingId);
  renderPlatformChecks(preferredVariant ? new Set([preferredVariant.platformId]) : new Set());
  refreshRows();

  closeModal(LISTING_MODAL_ID);
  openModal(POST_MODAL_ID);
  mustGetById<HTMLInputElement>('post-title').focus();
}

/** Abre el formulario de creación con una plantilla ya elegida (desde "Usar esta plantilla"). */
export function openCreateWithTemplate(templateId: number): void {
  openCreate(null, templateId);
}

/** Abre el formulario con los datos de un post existente (borrador o rechazado). */
function openEdit(postId: number): void {
  const post = getState().posts.find(p => p.id === postId);
  if (!post) return;

  const row: RowState = {
    platformId: post.platformId,
    postTypeId: post.postTypeId,
    templateId: post.templateId,
    files: [],
    previewUrls: [],
    existingImages: post.images,
  };
  form = { mode: 'edit', postId, rejectionReason: post.rejectionReason, rows: [row] };
  showFormError(null);

  const titleEl = getById<HTMLElement>('post-modal-title');
  if (titleEl) titleEl.textContent = t('post_form_edit');
  getById('post-platform-picker')?.setAttribute('hidden', '');

  const hint = getById('post-rejected-hint');
  if (hint) {
    if (post.status === 'rejected' && post.rejectionReason) {
      hint.hidden = false;
      hint.textContent = t('post_edit_rejected_hint').replace('{reason}', post.rejectionReason);
    } else {
      hint.hidden = true;
    }
  }

  mustGetById<HTMLInputElement>('post-title').value = post.title;
  mustGetById<HTMLTextAreaElement>('post-content').value = post.description;
  mustGetById<HTMLInputElement>('post-hashtags').value = post.hashtags;
  mustGetById<HTMLInputElement>('post-schedule').value = utcIsoToZonedInputValue(
    post.scheduledAt,
    getState().settings.timezone,
  );

  renderListingOptions(post.listingId);
  refreshRows();

  closeModal(LISTING_MODAL_ID);
  openModal(POST_MODAL_ID);
}

function closeForm(): void {
  form?.rows.forEach(revokeRowPreviews);
  form = null;
  closeModal(POST_MODAL_ID);
}

function mediaFormatForRow(row: RowState, group: PostTypeGroup | undefined): PostMedia {
  if (group === 'carousel') return 'carousel';
  if (group === 'video' || group === 'short_video') return 'video';
  if (group === 'story') return row.files.some(f => f.kind === 'video') ? 'video' : 'single';
  return 'single';
}

/** Revalida los archivos de una fila (síncrono al elegirlos; el ratio se añade después). */
function validateRow(row: RowState): boolean {
  const type = findPlatform(getState().platforms, row.platformId)?.postTypes.find(
    pt => pt.id === row.postTypeId,
  );
  if (!type) return true;
  const mustCheck = row.files.length > 0 || row.existingImages.length === 0;
  const issues = mustCheck ? validateMediaFiles(type.group, row.files) : [];
  renderMediaIssues(row.platformId, issues);
  return issues.length === 0;
}

async function handleSave(button: HTMLElement, submitAfter: boolean): Promise<void> {
  if (!form) return;
  showFormError(null);

  if (form.mode === 'create' && form.rows.length === 0) {
    showFormError(t('err_post_no_platform'));
    return;
  }
  const title = readTitle();
  if (!title) {
    showFormError(t('err_post_title_required'));
    return;
  }
  const scheduleLocal = readSchedule();
  if (!scheduleLocal) {
    showFormError(t('err_post_required'));
    return;
  }

  let allValid = true;
  for (const row of form.rows) allValid = validateRow(row) && allValid;
  if (!allValid) {
    showFormError(t('err_post_media_issues'));
    return;
  }
  // Ratio y duración (asíncrono): se comprueba tras la validación síncrona para no bloquear
  // la escritura mientras se pulsan teclas.
  for (const row of form.rows) {
    const type = findPlatform(getState().platforms, row.platformId)?.postTypes.find(
      pt => pt.id === row.postTypeId,
    );
    if (!type || row.files.length === 0) continue;
    const issues = [
      ...(await validateImageRatios(row.files, type.aspectRatios)),
      ...(await validateVideoDuration(row.files, type.maxDurationSeconds)),
    ];
    if (issues.length > 0) {
      renderMediaIssues(row.platformId, issues);
      allValid = false;
    }
  }
  if (!allValid) {
    showFormError(t('err_post_media_issues'));
    return;
  }

  const listingId = readListingId();
  const lang = POST_LANG_LABEL[readLangCode()];
  const description = readContent();
  const hashtags = readHashtags();
  const scheduledAt = zonedTimeToUtcIso(scheduleLocal, getState().settings.timezone);

  try {
    await withButtonLoading(button, async () => {
      const saved: Post[] = [];

      if (form?.mode === 'create') {
        for (const row of form.rows) {
          const type = findPlatform(getState().platforms, row.platformId)?.postTypes.find(
            pt => pt.id === row.postTypeId,
          );
          const draftInput: PostDraft = {
            listingId,
            platformId: row.platformId,
            postTypeId: row.postTypeId,
            templateId: row.templateId,
            media: mediaFormatForRow(row, type?.group),
            lang,
            title,
            description,
            hashtags,
            scheduledAt,
          };
          let created = await repos.posts.create(draftInput);
          if (row.files.length > 0) created = await repos.posts.setMedia(created.id, row.files);
          if (submitAfter) created = await repos.posts.submit(created.id);
          saved.push(created);
        }
      } else if (form?.mode === 'edit' && form.postId !== null) {
        const row = form.rows[0];
        if (!row) throw new Error('Falta la fila de la plataforma');
        const type = findPlatform(getState().platforms, row.platformId)?.postTypes.find(
          pt => pt.id === row.postTypeId,
        );
        let updated = await repos.posts.update(form.postId, {
          listingId,
          templateId: row.templateId,
          postTypeId: row.postTypeId,
          media: mediaFormatForRow(row, type?.group),
          lang,
          title,
          description,
          hashtags,
          scheduledAt,
        });
        if (row.files.length > 0) updated = await repos.posts.setMedia(updated.id, row.files);
        if (submitAfter) {
          if (updated.status === 'rejected') updated = await repos.posts.reopen(updated.id);
          updated = await repos.posts.submit(updated.id);
        }
        saved.push(updated);
      }

      setState(state => {
        const byId = new Map(saved.map(p => [p.id, p]));
        const merged = state.posts.map(p => byId.get(p.id) ?? p);
        const created = saved.filter(p => !state.posts.some(existing => existing.id === p.id));
        return { posts: [...merged, ...created] };
      });
    });

    const wasEdit = form.mode === 'edit';
    closeForm();
    showToast(
      t(
        submitAfter
          ? 'toast_post_submitted'
          : wasEdit
            ? 'toast_post_updated'
            : 'toast_post_draft_saved',
      ),
      { kind: 'success' },
    );
  } catch (error) {
    showFormError(errorMessage(error));
  }
}

const MARK_PUBLISHED_MODAL_ID = 'modal-mark-published';
let pendingPublishId: number | null = null;
let disarmPublish: (() => void) | null = null;

async function withdrawPost(id: number, button: HTMLElement): Promise<void> {
  const confirmed = await showDialog({
    level: 'confirm',
    title: t('dialog_withdraw_title'),
    message: t('dialog_withdraw_message'),
    confirmLabel: t('post_row_withdraw'),
  });
  if (!confirmed) return;
  try {
    const updated = await withButtonLoading(button, () => repos.posts.withdraw(id));
    setState(state => ({ posts: state.posts.map(p => (p.id === id ? updated : p)) }));
    showToast(t('toast_post_withdrawn'), { kind: 'success' });
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  }
}

function openMarkPublished(id: number): void {
  pendingPublishId = id;
  mustGetById<HTMLInputElement>('mark-published-url').value = '';
  const confirmBtn = mustGetById<HTMLButtonElement>('mark-published-confirm');
  disarmPublish?.();
  disarmPublish = armDangerButton(confirmBtn);
  openModal(MARK_PUBLISHED_MODAL_ID);
}

async function confirmMarkPublished(button: HTMLElement): Promise<void> {
  const id = pendingPublishId;
  if (id === null) return;
  const url = getById<HTMLInputElement>('mark-published-url')?.value.trim() || undefined;
  try {
    const updated = await withButtonLoading(button, () => repos.posts.markPublished(id, url));
    setState(state => ({ posts: state.posts.map(p => (p.id === id ? updated : p)) }));
    closeModal(MARK_PUBLISHED_MODAL_ID);
    void offerPostUndo(id, t('toast_post_published_marked'));
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  }
}

/** Exporta a PNG la vista previa en vivo de la plantilla elegida para esta fila. */
async function exportRowPng(platformId: PlatformId): Promise<void> {
  const row = currentRow(platformId);
  if (!row?.templateId) return;
  const tpl = getState().templates.find(t => t.id === row.templateId);
  const el = document.querySelector<HTMLElement>(
    `#post-preview-wrap-${CSS.escape(platformId)} .tpl-preview`,
  );
  if (!tpl || !el) return;
  try {
    await exportTemplateAsPng(el, tpl, `post-${platformId}`, platformId, row.postTypeId);
  } catch (error) {
    showToast(errorMessage(error), { kind: 'error' });
  }
}

/**
 * "Modo manual asistido": genera un archivo de texto con el texto, los hashtags, el listing y
 * una lista de comprobación, más los enlaces a los archivos multimedia ya subidos. No es un
 * paquete comprimido con los propios archivos (ver limitaciones en docs/F4.md).
 */
function downloadPackage(id: number): void {
  const post = getState().posts.find(p => p.id === id);
  if (!post) return;
  const listing = post.listingId
    ? getState().listings.find(l => l.id === post.listingId)
    : undefined;

  const lines = [
    `${t('pkg_title')}: ${post.title}`,
    '',
    `${t('pkg_caption')}:`,
    post.description || '—',
    '',
    `${t('pkg_hashtags')}: ${post.hashtags || '—'}`,
  ];
  if (listing) lines.push(`${t('pkg_listing')}: ${listingTitle(listing, getState().lang)}`);
  lines.push(`${t('pkg_schedule')}: ${post.date}`, '', `${t('pkg_checklist')}:`);
  lines.push(
    `- ${t('pkg_checklist_format')}`,
    `- ${t('pkg_checklist_review')}`,
    `- ${t('pkg_checklist_publish')}`,
  );
  post.images.forEach((src, i) => {
    lines.push(`${t('pkg_media_file').replace('{n}', String(i + 1))}: ${src}`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `post-${String(post.id)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function initPosts(): void {
  registerActions({
    'post:new': el => {
      const raw = el.dataset.listingId;
      openCreate(raw ? Number(raw) : null);
    },
    'post:edit': el => {
      openEdit(Number(el.dataset.id));
    },
    'post:close': () => {
      closeForm();
    },
    'post:pick-file': el => {
      openFilePicker(el.dataset.id as PlatformId);
    },
    'post:remove-file': el => {
      const row = currentRow(el.dataset.id as PlatformId);
      if (!row) return;
      const index = Number(el.dataset.index);
      if (row.files.length > 0) {
        URL.revokeObjectURL(row.previewUrls[index] ?? '');
        row.files.splice(index, 1);
        row.previewUrls.splice(index, 1);
      } else {
        // Los archivos ya guardados solo se sustituyen en bloque (no uno a uno): "quitar" en
        // modo edición vacía todo el conjunto y exige subir contenido nuevo si el tipo lo requiere.
        row.existingImages = [];
      }
      refreshRows();
    },
    'post:save-draft': el => {
      void handleSave(el, false);
    },
    'post:submit': el => {
      void handleSave(el, true);
    },
    'post:withdraw': el => {
      void withdrawPost(Number(el.dataset.id), el);
    },
    'post:mark-published': el => {
      openMarkPublished(Number(el.dataset.id));
    },
    'post:mark-published-confirm': el => {
      void confirmMarkPublished(el);
    },
    'post:download-package': el => {
      downloadPackage(Number(el.dataset.id));
    },
    'post:export-png': el => {
      void exportRowPng(el.dataset.id as PlatformId);
    },
  });

  onModalClose(MARK_PUBLISHED_MODAL_ID, () => {
    disarmPublish?.();
    disarmPublish = null;
    pendingPublishId = null;
  });

  registerChangeActions({
    'post:toggle-platform': el => {
      if (!form) return;
      const id = el.dataset.id as PlatformId;
      const checked = (el as HTMLInputElement).checked;
      if (checked && !currentRow(id)) form.rows.push(emptyRow(id));
      else if (!checked) {
        const row = currentRow(id);
        if (row) revokeRowPreviews(row);
        form.rows = form.rows.filter(r => r.platformId !== id);
      }
      refreshRows();
    },
    'post:type': el => {
      const row = currentRow(el.dataset.id as PlatformId);
      if (!row) return;
      row.postTypeId = (el as HTMLSelectElement).value || null;
      // La plantilla elegida puede dejar de ser compatible con el nuevo tipo.
      if (
        !compatibleTemplates(row.platformId, row.postTypeId).some(tpl => tpl.id === row.templateId)
      ) {
        row.templateId = null;
      }
      refreshRows();
    },
    'post:template': el => {
      const row = currentRow(el.dataset.id as PlatformId);
      if (!row) return;
      const raw = (el as HTMLSelectElement).value;
      row.templateId = raw === '' ? null : Number(raw);
      refreshRows();
    },
    'post:file-change': el => {
      const row = currentRow(el.dataset.id as PlatformId);
      const input = el as HTMLInputElement;
      const chosen = Array.from(input.files ?? []);
      if (!row || chosen.length === 0) return;

      revokeRowPreviews(row);
      const files: MediaFile[] = chosen.map(file => ({
        file,
        kind: file.type.startsWith('video/') ? 'video' : 'image',
      }));
      row.files = files;
      row.previewUrls = files.map(f => URL.createObjectURL(f.file));
      row.existingImages = [];
      input.value = '';
      refreshRows();
      validateRow(row);
    },
  });

  getById<HTMLTextAreaElement>('post-content')?.addEventListener('input', updateCharCount);
  getById<HTMLSelectElement>('post-lang')?.addEventListener('change', updateCharCount);
  getById<HTMLSelectElement>('post-listing')?.addEventListener('change', () => {
    const titleInput = getById<HTMLInputElement>('post-title');
    if (titleInput && titleInput.value.trim() === '') {
      const id = readListingId();
      const listing = id === null ? null : getState().listings.find(l => l.id === id);
      if (listing) titleInput.value = listingTitle(listing, getState().lang);
    }
    refreshRows(); // la vista previa en vivo depende del listing elegido
  });
}
