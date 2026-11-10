import { Link } from 'react-router';
import { useCartStore } from '../store/cartStore';
export default function ProductCard({ product }) {
  const addItem = useCartStore(state => state.addItem);
  return <article className="card"><Link to={`/products/${product.id}`} className="product-image"><img src={product.thumbnail} alt={product.title} loading="lazy" /></Link>
    <div className="card-body"><small>{product.category}</small><h2><Link to={`/products/${product.id}`}>{product.title}</Link></h2>
      <div className="card-bottom"><strong>${product.price.toFixed(2)}</strong><button onClick={() => addItem(product)}>Add to cart</button></div></div></article>;
}
