import { localize } from '../i18n';
import type { Approval, Lang, Listing, Post } from '../types/models';

/** Posts pendientes de aprobación, listos para la vista de aprobaciones. */
export function pendingApprovals(posts: readonly Post[], listings: readonly Listing[]): Approval[] {
  return posts
    .filter(p => p.status === 'pending' && !p.deleted)
    .map(p => ({
      id: p.id,
      postId: p.id,
      title: p.title,
      author: p.authorName,
      listing: listings.find(l => l.id === p.listingId)?.title ?? null,
      platformId: p.platformId,
      lang: p.lang,
      date: p.date,
    }));
}

export const approvalListingName = (approval: Approval, lang: Lang): string =>
  approval.listing ? localize(approval.listing, lang) : '—';
