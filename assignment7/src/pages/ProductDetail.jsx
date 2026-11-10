import { Link, useNavigate, useParams } from 'react-router';
import { fetchProduct } from '../api/productsApi';
import { useFetch } from '../hooks/useFetch';
import { useCartStore } from '../store/cartStore';
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data: product } = useFetch(fetchProduct, [id]);
  const addItem = useCartStore(state => state.addItem);
  return <section><button onClick={() => navigate('/products')}>← Back to products</button>
    {loading ? <p role="status">Loading product…</p> : error ? <p role="alert">{error}</p> : product && <div className="detail">
      <div className="detail-image"><img src={product.thumbnail} alt={product.title} /></div><div><p className="eyebrow">{product.category}</p><h1>{product.title}</h1>
        <p>{product.description}</p><p className="price">${product.price.toFixed(2)}</p><button className="primary" onClick={() => addItem(product)}>Add to cart</button>
        <p><Link to={`/products/${Number(id) + 1}`}>Next product →</Link></p></div></div>}
  </section>;
}
