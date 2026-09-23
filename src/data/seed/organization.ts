import type { TablesInsert } from '../../types/db';

export const organizationSettingsSeed: TablesInsert<'organization_settings'> = {
  name: 'HOME DIRECT',
  timezone: 'America/Toronto',
  undo_window_seconds: 8,
  deleted_retention_days: 30,
};
