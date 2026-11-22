import { useState } from 'react';
import { genres } from './Filters.jsx';

export default function BookForm({ book, busy, onSave, onCancel }) {
  const [values, setValues] = useState(book || { title: '', author: '', year: '', genre: 'fiction', read: false, rating: null });
  function change(event) {
    const { name, value, checked, type } = event.target;
    const updated = { ...values, [name]: type === 'checkbox' ? checked : value };
    if (name === 'read' && !checked) updated.rating = null;
    setValues(updated);
  }
  function submit(event) {
    event.preventDefault();
    onSave({ title: values.title, author: values.author, year: Number(values.year), genre: values.genre,
      read: values.read, rating: values.rating === '' || values.rating === null ? null : Number(values.rating) });
  }
  return <section aria-labelledby="form-title"><h2 id="form-title">{book ? 'Edit book' : 'Add a book'}</h2>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <label>Title<input name="title" value={values.title} maxLength={100} required onChange={change} /></label>
      <label>Author<input name="author" value={values.author} maxLength={100} required onChange={change} /></label>
      <label>Year<input name="year" type="number" min={1000} max={new Date().getFullYear()} step={1} value={values.year} required onChange={change} /></label>
      <label>Book genre<select name="genre" value={values.genre} onChange={change}>{genres.map((g) => <option key={g}>{g}</option>)}</select></label>
      <label className="checkbox"><input name="read" type="checkbox" checked={values.read} onChange={change} />Already read</label>
      <label>Book rating<select name="rating" value={values.rating ?? ''} disabled={!values.read} onChange={change}>
        <option value="">Not rated</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
      </select></label>
      <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving...' : book ? 'Save changes' : 'Add book'}</button>
        {book && <button type="button" onClick={onCancel}>Cancel edit</button>}</div>
    </fieldset></form>
  </section>;
}
