import { z } from 'zod';
import { IdentityUnknownError } from './errors';

const identityUnknownResponseSchema = z.object({
  error: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const fetchJson = async <T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 422 && body.includes('identity_unknown')) {
      const parsed = identityUnknownResponseSchema.parse(JSON.parse(body));
      throw new IdentityUnknownError(parsed.userName, parsed.userEmail);
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }
  const json: unknown = await res.json();
  return schema.parse(json);
};
