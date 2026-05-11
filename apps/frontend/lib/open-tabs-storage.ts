import { z } from 'zod';

export const OPEN_TAB_IDS_SETTING_KEY = 'open-tab-ids';

const openTabIdsSchema = z.array(z.string());

export const parseOpenTabIds = (raw: string | null): string[] | null => {
  if (raw === null) return null;
  try {
    const parsed = openTabIdsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
