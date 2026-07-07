// Generic authenticated CRUD client for the Supabase-backed feature tables.
import { getToken } from './authApi';

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const listItems = (resource) => req(`/data/${resource}`, { method: 'GET' }).then(r => r.data || []);
export const createItem = (resource, row) => req(`/data/${resource}`, { method: 'POST', body: JSON.stringify(row) }).then(r => r.data);
export const updateItem = (resource, id, patch) => req(`/data/${resource}`, { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }).then(r => r.data);
export const deleteItem = (resource, id) => req(`/data/${resource}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
