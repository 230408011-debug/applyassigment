import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { login, DEMO_USERNAME } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const { dispatch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(username, password);
      if (!active.current) return;
      dispatch({ type: 'LOGGED_IN', user });
      const from = location.state?.from;
      navigate(from ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/', { replace: true });
    } catch (error) { if (active.current) setError(error.message); }
    finally { if (active.current) setLoading(false); }
  }
  return <section className="login"><p className="eyebrow">WELCOME BACK</p><h1>Sign in to your cart.</h1><p className="muted">A demo account, for a simple shopping experience.</p>
    <form onSubmit={submit}><label>Student email<input type="email" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form>
    <aside className="demo"><strong>Demo credentials</strong><p>{DEMO_USERNAME}<br />Password: demo123456</p></aside></section>;
}
