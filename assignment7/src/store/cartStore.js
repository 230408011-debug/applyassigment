import { create } from 'zustand';
const KEY = 'assignment7-cart';
function readItems() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && Number.isInteger(item.id) && typeof item.title === 'string'
      && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0);
  } catch { return []; }
}
export const useCartStore = create(set => ({
  items: readItems(),
  addItem: product => set(state => ({ items: state.items.some(item => item.id === product.id)
    ? state.items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...state.items, { id: product.id, title: product.title, price: product.price, quantity: 1 }] })),
  removeItem: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
  setQuantity: (id, quantity) => {
    if (!Number.isFinite(quantity)) return;
    const next = Math.floor(quantity);
    set(state => ({ items: next < 1 ? state.items.filter(item => item.id !== id)
      : state.items.map(item => item.id === id ? { ...item, quantity: next } : item) }));
  },
  clear: () => set({ items: [] }),
}));
useCartStore.subscribe((state, previous) => {
  if (state.items !== previous.items) {
    try { localStorage.setItem(KEY, JSON.stringify(state.items)); }
    catch { /* Keep the cart usable when storage is blocked or full. */ }
  }
});
