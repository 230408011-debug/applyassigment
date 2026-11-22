import { useEffect, useState } from 'react';
import { listBooks, getStats, addBook, replaceBook, patchBook, removeBook } from './api/books.js';
import Stats from './components/Stats.jsx';
import BookForm from './components/BookForm.jsx';
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

  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [formKey, setFormKey] = useState(0);

  function refresh() {
    setLoading(true);
    setError('');
    setRevision((n) => n + 1);
  }

  function changeFilters(values) {
    setLoading(true);
    setError('');
    setFilters(values);
  }

  async function saveBook(values) {
    setBusy(true); setActionError(''); setNotice('');
    try {
      if (editing) await replaceBook(editing.id, values);
      else await addBook(values);
      setEditing(null); setFormKey((n) => n + 1);
      refresh(); setNotice('Book saved.');
    } catch (err) { setActionError(err.message); }
    finally { setBusy(false); }
  }

  async function changeBook(book, changes) {
    setBusy(true); setActionError(''); setNotice('');
    try {
      await patchBook(book.id, changes);
      refresh(); setNotice('Book updated.');
      if (editing?.id === book.id) setEditing(null);
    } catch (err) { setActionError(err.message); }
    finally { setBusy(false); }
  }

  async function deleteBook(book) {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      await removeBook(book.id);
      refresh(); setNotice('Book deleted.');
      if (editing?.id === book.id) setEditing(null);
    } catch (err) { setActionError(err.message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
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
    <p className="note">Data resets to the seed books when the API restarts.</p>
    <Filters filters={filters} onChange={changeFilters} disabled={busy} />
    {actionError && <p role="alert" className="error">{actionError}</p>}
    {notice && <p role="status" className="success">{notice}</p>}
    <BookForm key={`${editing?.id ?? 'new'}-${formKey}`} book={editing} busy={busy} onSave={saveBook} onCancel={() => setEditing(null)} />
    <Stats stats={stats} />
    {loading ? <p role="status">Loading books...</p> : error
      ? <div role="alert">{error} <button onClick={refresh}>Retry</button></div>
      : <BookList books={books} busy={busy} onEdit={(book) => { setEditing(book); setActionError(''); setNotice(''); }} onToggle={(book) => changeBook(book, { read: !book.read, rating: book.read ? null : book.rating })} onRate={(book, rating) => changeBook(book, { rating })} onDelete={deleteBook} />}
  </main>;
}
