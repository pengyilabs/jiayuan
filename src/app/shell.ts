/** Ensambla el HTML de la aplicación a partir de los fragmentos por feature. */
import shell from './partials/shell.html?raw';
import sidebar from './partials/sidebar.html?raw';
import topbar from './partials/topbar.html?raw';
import homeHeader from '../features/home/home-header.html?raw';
import homeView from '../features/home/home.view.html?raw';
import listingsView from '../features/listings/listings.view.html?raw';
import listingDetailModal from '../features/listings/listing-detail.modal.html?raw';
import newListingModal from '../features/listings/new-listing.modal.html?raw';
import postModal from '../features/posts/post.modal.html?raw';
import markPublishedModal from '../features/posts/mark-published.modal.html?raw';
import templatesView from '../features/templates/templates.view.html?raw';
import templatePreviewModal from '../features/templates/template-preview.modal.html?raw';
import approvalsView from '../features/approvals/approvals.view.html?raw';
import rejectModal from '../features/approvals/reject.modal.html?raw';
import inviteModal from '../features/team/invite.modal.html?raw';
import settingsView from '../features/settings/settings.view.html?raw';

const PAGES = [homeView, listingsView, templatesView, approvalsView, settingsView];
const MODALS = [
  newListingModal,
  postModal,
  markPublishedModal,
  templatePreviewModal,
  rejectModal,
  listingDetailModal,
  inviteModal,
];

export function composeShell(): string {
  return shell
    .replace('<!--@sidebar-->', sidebar)
    .replace('<!--@home-header-->', homeHeader)
    .replace('<!--@topbar-->', topbar)
    .replace('<!--@pages-->', PAGES.join('\n'))
    .replace('<!--@modals-->', MODALS.join('\n'));
}

export function mountShell(root: HTMLElement): void {
  root.innerHTML = composeShell();
}
