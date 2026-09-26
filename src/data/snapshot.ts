import type {
  Listing,
  Notification,
  OrganizationSettings,
  Platform,
  Post,
  PostTypeGroups,
  Profile,
  Template,
} from '../types/models';
import type { Repositories } from './repositories/types';

/** Todo lo que la interfaz necesita para arrancar. */
export interface DataSnapshot {
  currentUser: Profile | null;
  /** Miembros del equipo visibles para el usuario (el administrador ve a todos). */
  team: Profile[];
  settings: OrganizationSettings;
  listings: Listing[];
  posts: Post[];
  platforms: Platform[];
  postTypeGroups: PostTypeGroups;
  templates: Template[];
  notifications: Notification[];
}

export const EMPTY_SNAPSHOT: DataSnapshot = {
  currentUser: null,
  team: [],
  settings: {
    name: '',
    timezone: 'America/Toronto',
    undoWindowSeconds: 8,
    deletedRetentionDays: 30,
    requireAdminMfa: true,
  },
  listings: [],
  posts: [],
  platforms: [],
  postTypeGroups: {} as PostTypeGroups,
  templates: [],
  notifications: [],
};

/**
 * Carga los datos visibles para el usuario actual. La zona horaria se lee primero porque los
 * repositorios la usan para calcular el día de publicación de cada post.
 */
export async function loadSnapshot(
  repos: Repositories,
  onTimeZone: (timeZone: string) => void,
): Promise<DataSnapshot> {
  const settings = await repos.catalog.settings();
  onTimeZone(settings.timezone);
  const [currentUser, team, listings, posts, platforms, postTypeGroups, templates, notifications] =
    await Promise.all([
      repos.profiles.current(),
      repos.profiles.list(),
      repos.listings.list(),
      repos.posts.list(),
      repos.catalog.platforms(),
      repos.catalog.postTypeGroups(),
      repos.catalog.templates(),
      repos.notifications.list(),
    ]);
  return {
    currentUser,
    team,
    settings,
    listings,
    posts,
    platforms,
    postTypeGroups,
    templates,
    notifications,
  };
}
