import { localize } from '../../i18n';
import type { Lang, Platform, PlatformId, PostType } from '../../types/models';
import { PLATFORM_FEED_ICONS } from '../../ui/icons/platform-icons';
import { raw } from '../../core/html';
import type { SafeHtml } from '../../core/html';

export function platformDisplayName(platform: Platform, lang: Lang): string {
  return localize(platform.name, lang);
}

export function platformDescription(platform: Platform, lang: Lang): string {
  return localize(platform.description, lang);
}

export function postTypeName(type: PostType, lang: Lang): string {
  return localize(type.name, lang);
}

export function findPlatform(platforms: readonly Platform[], id: PlatformId): Platform | undefined {
  return platforms.find(p => p.id === id);
}

/** Icono completo del feed, o cadena vacía si la plataforma no tiene uno propio. */
export function feedIcon(id: PlatformId): SafeHtml | '' {
  const svg = PLATFORM_FEED_ICONS[id];
  return svg ? raw(svg) : '';
}
