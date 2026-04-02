/**
 * Holds get_job_applicants MCP results pushed from Mobeus via site functions
 * so the employer UI can render cards without a second API call.
 */

import type { ApplicationWithProfileListResponse } from './employerApi';

const byPostingId = new Map<string, ApplicationWithProfileListResponse>();

function normalizeApplicantsPayload(raw: unknown): ApplicationWithProfileListResponse | null {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  // Mobeus sometimes passes the raw execute envelope: content[0].text = stringified JSON
  const content = o.content;
  if (Array.isArray(content) && content[0] && typeof (content[0] as { text?: string }).text === 'string') {
    return normalizeApplicantsPayload((content[0] as { text: string }).text);
  }
  let items = o.items;
  let total = o.total;
  let limit = o.limit;
  let offset = o.offset;
  if (!Array.isArray(items)) {
    const data = o.data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.items)) {
        items = d.items;
        total = total ?? d.total;
        limit = limit ?? d.limit;
        offset = offset ?? d.offset;
      }
    }
  }
  if (!Array.isArray(items)) return null;
  return {
    items: items as ApplicationWithProfileListResponse['items'],
    total: typeof total === 'number' ? total : items.length,
    limit: typeof limit === 'number' ? limit : items.length,
    offset: typeof offset === 'number' ? offset : 0,
  };
}

export function cacheJobApplicantsFromTool(postingId: string, raw: unknown): boolean {
  const id = postingId?.trim();
  if (!id) return false;
  const norm = normalizeApplicantsPayload(raw);
  if (!norm) {
    console.warn('[employerApplicantsCache] invalid payload for posting', id, raw);
    return false;
  }
  byPostingId.set(id, norm);
  return true;
}

export function getCachedJobApplicants(postingId: string): ApplicationWithProfileListResponse | null {
  const id = postingId?.trim();
  if (!id) return null;
  return byPostingId.get(id) ?? null;
}

export function clearCachedJobApplicants(postingId: string): void {
  const id = postingId?.trim();
  if (id) byPostingId.delete(id);
}
