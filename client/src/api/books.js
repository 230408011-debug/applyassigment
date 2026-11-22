const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function request(path, { body, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function listBooks(filters, signal) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '') query.set(key, value);
  }
  return request(`/api/books?${query.toString()}`, { signal });
}
export const getStats = (signal) => request('/api/stats', { signal });
export const addBook = (book) => request('/api/books', { method: 'POST', body: book });
export const replaceBook = (id, book) => request(`/api/books/${id}`, { method: 'PUT', body: book });
export const patchBook = (id, changes) => request(`/api/books/${id}`, { method: 'PATCH', body: changes });
export const removeBook = (id) => request(`/api/books/${id}`, { method: 'DELETE' });
