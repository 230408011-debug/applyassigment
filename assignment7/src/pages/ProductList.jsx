import { useSearchParams } from 'react-router';
import { useFetch } from '../hooks/useFetch';
import { fetchProducts } from '../api/productsApi';
import ProductCard from '../components/ProductCard';
export default function ProductList() {
  const { loading, error, data } = useFetch(fetchProducts);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const products = data || [];
  const categories = [...new Set(products.map(product => product.category))].sort();
  const filtered = products.filter(product => product.title.toLowerCase().includes(q.toLowerCase()) && (!category || product.category === category));
  function update(key, value) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; });
  }
  return <section><p className="eyebrow">THE COLLECTION</p><h1>Find your next favorite.</h1>
    <div className="filters"><label>Search products<input value={q} onChange={event => update('q', event.target.value)} placeholder="Search by title…" /></label>
      <label>Category<select value={category} onChange={event => update('category', event.target.value)}><option value="">All categories</option>
        {category && !categories.includes(category) && <option value={category}>{category}</option>}
        {categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {loading ? <p role="status">Loading products…</p> : error ? <p role="alert">{error}</p> : <><p className="muted">{filtered.length} products</p>
      {filtered.length ? <div className="grid">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="empty"><h2>No matching products</h2><p>Try another search or category.</p><button onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.delete('q'); next.delete('category'); return next; })}>Clear filters</button></div>}</>}
  </section>;
}
