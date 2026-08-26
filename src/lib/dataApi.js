// Generic authenticated CRUD client for the Supabase-backed feature tables.
import { getToken } from './authApi';
import { apiFetch, parseJson } from './http';
import * as DB from './db';

// Through apiFetch (src/lib/http.js) so a dropped request on a filtered network
// retries instead of surfacing as the browser's "Failed to fetch" — see that
// file's header for the whole story.
//
// A write gets ONE retry where a read gets the default two. The asymmetry is the
// honest reading of the risk: apiFetch only ever repeats a request that failed
// at the transport layer, but "failed at the transport layer" includes the case
// where the server handled the request and the *response* was lost on the way
// back, and repeating that turns one created row into two. The unique indexes on
// these tables catch most of it as a 409 (which callers already treat as
// converge-and-re-read), so one retry is worth having; a second is spending
// somebody's data on a diminishing return.
const retriesFor = (method) => (!method || method === 'GET' ? 2 : 1);

async function req(path, options = {}) {
  const token = getToken();
  const res = await apiFetch(path, {
    ...options,
    retries: retriesFor(options.method),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) {
    // `status` and `reason` ride along on the error so callers can tell a 409 (the unique index
    // rejecting a row another device already wrote — expected, converge by re-reading) apart from
    // a 500 (something is actually broken and a human needs to know). Without that distinction a
    // caller's only honest option is to treat every failure as benign, which is precisely how the
    // MedEx seal endpoint stayed broken and silent — see api/data/[resource].js.
    const err = new Error(data.error || 'Request failed.');
    err.status = res.status;
    err.reason = data.reason || null;
    throw err;
  }
  return data;
}

export const listItems = (resource) => req(`/data/${resource}`, { method: 'GET' }).then(r => r.data || []);
export const createItem = (resource, row) => req(`/data/${resource}`, { method: 'POST', body: JSON.stringify(row) }).then(r => r.data);
export const updateItem = (resource, id, patch) => req(`/data/${resource}`, { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }).then(r => r.data);
export const deleteItem = (resource, id) => req(`/data/${resource}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// One-time move of clinicalHours/recommenders out of local-only Dexie storage into the
// Supabase-backed clinical_hours/recommenders resources, so existing users don't lose logs
// they already entered before this became a synced, verifiable Portfolio resource (mirrors the
// precedent set by the earlier v4 Dexie migration of portfolio/gpaEntries). Gated by a
// localStorage flag so it only ever runs once per browser; safe to call on every app load.
const MIGRATION_FLAG = 'migratedPortfolioLogsV1';
export async function migrateLocalPortfolioLogs() {
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  try {
    const [localClinical, localRecommenders] = await Promise.all([
      DB.getClinicalHours(), DB.getRecommenders(),
    ]);
    if (!localClinical.length && !localRecommenders.length) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }
    // Upload each row independently and only clear + set the flag if every single one
    // succeeded — a partial failure leaves the flag unset (and local rows untouched) so the
    // next app load retries the whole batch rather than risking silent data loss or, on a
    // naive retry, duplicate rows for the ones that already made it to Supabase.
    const results = await Promise.allSettled([
      ...localClinical.map(r => createItem('clinical_hours', {
        site_name: r.siteName, site_type: r.siteType, supervisor_name: r.supervisorName,
        hours: r.hours, entry_date: r.entryDate, notes: r.notes,
      })),
      ...localRecommenders.map(r => createItem('recommenders', {
        name: r.name, relationship: r.relationship, type: r.type, status: r.status,
        due_date: r.dueDate, notes: r.notes,
      })),
    ]);
    if (results.some(r => r.status === 'rejected')) return; // retry next load
    await DB.clearClinicalHoursLocal();
    await DB.clearRecommendersLocal();
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // Leave the flag unset so we retry on next load (e.g. offline, or not signed in yet).
  }
}
