const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export function formatPrice(value) { return currency.format(value); }
