export default function BookList({ books, busy, onEdit, onToggle, onRate, onDelete }) {
  if (books.length === 0) return <p role="status">No books match your search.</p>;
  return <ul className="book-list">{books.map((book) => <li key={book.id}>
    <div><h3>{book.title}</h3><p>{book.author} · {book.year} · {book.genre}</p>
      <p>{book.read ? 'Read' : 'Unread'} · {book.rating === null ? 'Not rated' : `${book.rating}/5`}</p></div>
    <div className="book-actions">
      <button type="button" disabled={busy} onClick={() => onToggle(book)}>{book.read ? 'Mark unread' : 'Mark read'}</button>
      <label>Rating for {book.title}<select value={book.rating ?? ''} disabled={busy || !book.read}
        onChange={(event) => onRate(book, event.target.value === '' ? null : Number(event.target.value))}>
        <option value="">Not rated</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
      </select></label>
      <button type="button" disabled={busy} onClick={() => onEdit(book)}>Edit</button>
      <button type="button" className="delete" disabled={busy} onClick={() => onDelete(book)}>Delete</button>
    </div>
  </li>)}</ul>;
}
