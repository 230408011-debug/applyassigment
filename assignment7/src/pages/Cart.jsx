import { Link } from 'react-router';
import { useCartStore } from '../store/cartStore';
export default function Cart() {
  const items = useCartStore(state => state.items);
  const setQuantity = useCartStore(state => state.setQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clear = useCartStore(state => state.clear);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <section><p className="eyebrow">YOUR SELECTION</p><h1>Shopping cart</h1>
    {!items.length ? <div className="empty"><h2>Your cart is empty.</h2><Link to="/products">Explore products →</Link></div>
      : <><div className="cart-list">{items.map(item => <article className="cart-row" key={item.id}><div><Link to={`/products/${item.id}`}>{item.title}</Link><p>${item.price.toFixed(2)} each</p></div>
        <label>Quantity<input aria-label={`Quantity for ${item.title}`} type="number" min="0" step="1" value={item.quantity} onChange={event => setQuantity(item.id, Number(event.target.value))} /></label>
        <strong>${(item.price * item.quantity).toFixed(2)}</strong><button onClick={() => removeItem(item.id)}>Remove</button></article>)}</div>
        <div className="cart-total"><button onClick={clear}>Clear cart</button><h2>Total: ${total.toFixed(2)}</h2></div></>}
  </section>;
}
