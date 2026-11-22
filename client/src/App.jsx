import { useEffect, useState } from 'react';
import { listBooks, getStats } from './api/books.js';
import Filters from './components/Filters.jsx';
import BookList from './components/BookList.jsx';
import './App.css';

export default function App() {
  const [filters, setFilters] = useState({ q: '', genre: '', read: '', sort: '', order: 'asc' });
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([listBooks(filters, controller.signal), getStats(controller.signal)])
      .then(([newBooks, newStats]) => {
        if (!controller.signal.aborted) { setBooks(newBooks); setStats(newStats); }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && !controller.signal.aborted) setError(err.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, revision]);

  return <main>
    <header><p>CMP309 · Assignment 9</p><h1>My Reading List</h1><p>Özcan Öztürk · 230408011</p></header>
    <Filters filters={filters} onChange={setFilters} />
    {stats && <p>{stats.total} books in the whole list.</p>}
    {loading ? <p role="status">Loading books...</p> : error
      ? <div role="alert">{error} <button onClick={() => setRevision((n) => n + 1)}>Retry</button></div>
      : <BookList books={books} busy={false} onEdit={() => {}} onToggle={() => {}} onRate={() => {}} onDelete={() => {}} />}
  </main>;
}
