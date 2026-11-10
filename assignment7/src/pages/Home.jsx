import { Link } from 'react-router';
export default function Home() {
  return <section className="hero"><p className="eyebrow">EVERYDAY FINDS, ONE SIMPLE SHOP</p>
    <h1>A little discovery.<br />A better everyday.</h1><p>Explore beauty, home essentials and more. Find your favorites and make them yours.</p>
    <Link className="button primary" to="/products">Explore the collection →</Link>
    <div className="hero-notes"><span>100 products to discover</span><span>A cart that stays with you</span><span>Your choice of light or dark</span></div>
  </section>;
}
