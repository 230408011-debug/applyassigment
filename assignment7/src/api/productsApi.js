const BASE = 'https://dummyjson.com/products';
async function request(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(response.status === 404 ? 'Product not found.' : `Unable to load products (HTTP ${response.status}).`);
  return response.json();
}
export async function fetchProducts(signal) {
  const data = await request(`${BASE}?limit=100`, signal);
  return data.products;
}
export function fetchProduct(id, signal) {
  if (!/^\d+$/.test(id)) return Promise.reject(new Error('Product not found.'));
  return request(`${BASE}/${encodeURIComponent(id)}`, signal);
}
