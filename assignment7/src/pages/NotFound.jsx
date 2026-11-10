import { Link } from 'react-router';
export default function NotFound() {
  return <section className="empty"><p className="eyebrow">404</p><h1>This page wandered off.</h1><p>The address does not match a page in this shop.</p><Link to="/">Back to home →</Link></section>;
}
