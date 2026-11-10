import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
export default function NavBar({ theme, toggleTheme }) {
  const count = useCartStore(state => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const { user, dispatch } = useAuth();
  return <header><NavLink className="brand" to="/">OZ<span> / SHOP</span></NavLink>
    <nav aria-label="Main navigation"><NavLink to="/" end>Home</NavLink><NavLink to="/products">Products</NavLink>
      <NavLink to="/cart">Cart <span className="badge">{count}</span></NavLink>
      {user ? <><span className="username">{user.username}</span><button onClick={() => dispatch({ type: 'LOGGED_OUT' })}>Logout</button></>
        : <NavLink to="/login">Login</NavLink>}
      <button onClick={toggleTheme} aria-label="Toggle color theme">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
    </nav></header>;
}
