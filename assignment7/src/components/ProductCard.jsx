import { useState } from 'react';
import { formatPrice } from '../utils/formatPrice';
import { Link } from 'react-router';
import { useCartStore } from '../store/cartStore';
export default function ProductCard({ product }) {
  const [added, setAdded] = useState(false);
  const addItem = useCartStore(state => state.addItem);
  return <article className="card"><Link to={`/products/${product.id}`} className="product-image"><img src={product.thumbnail} alt={product.title} loading="lazy" /></Link>
    <div className="card-body"><small>{product.category}</small><h2><Link to={`/products/${product.id}`}>{product.title}</Link></h2>
      <div className="card-bottom"><strong>{formatPrice(product.price)}</strong><button aria-label={`Add ${product.title} to cart`} onClick={() => { addItem(product); setAdded(true); }}>Add to cart</button></div><p className="muted" role="status">{added ? `${product.title} added to cart.` : ''}</p></div></article>;
}
