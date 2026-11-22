import { httpError, validateBook } from './validate.js';

let books = [
  { id: 1, title: 'The Hobbit', author: 'J. R. R. Tolkien', year: 1937, genre: 'fantasy', read: true, rating: 5 },
  { id: 2, title: '1984', author: 'George Orwell', year: 1949, genre: 'fiction', read: false, rating: null },
  { id: 3, title: 'A Brief History of Time', author: 'Stephen Hawking', year: 1988, genre: 'science', read: true, rating: 4 },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, genre: 'history', read: false, rating: null },
  { id: 5, title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', year: 1943, genre: 'fiction', read: true, rating: 4 },
  { id: 6, title: 'Atomic Habits', author: 'James Clear', year: 2018, genre: 'non-fiction', read: false, rating: null }
];
let nextId = 7;
const delay = () => new Promise((resolve) => setTimeout(resolve, 25));

export async function listBooks(query = {}) {
  await delay();
  let result = books.map((book) => ({ ...book }));
  if (query.genre) result = result.filter((book) => book.genre === query.genre);
  if (query.read !== undefined) result = result.filter((book) => book.read === (query.read === 'true'));
  if (query.q !== undefined) {
    const q = query.q.toLowerCase();
    result = result.filter((book) => book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q));
  }
  const field = query.sort ?? 'id';
  const direction = query.order === 'desc' ? -1 : 1;
  result = [...result].sort((a, b) => {
    // Unrated books stay last in BOTH directions.
    if (field === 'rating') {
      if (a.rating === null && b.rating === null) return a.id - b.id;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
    }
    const comparison = typeof a[field] === 'string'
      ? a[field].localeCompare(b[field])
      : a[field] - b[field];
    return comparison * direction || a.id - b.id;
  });
  const limit = query.limit ?? 50;
  const start = ((query.page ?? 1) - 1) * limit;
  return result.slice(start, start + limit);
}

export async function getBook(id) {
  await delay();
  const book = books.find((item) => item.id === id);
  return book ? { ...book } : null;
}

export async function getStats() {
  await delay();
  const rated = books.filter((book) => book.rating !== null);
  const byGenre = books.reduce((counts, book) => ({ ...counts, [book.genre]: (counts[book.genre] ?? 0) + 1 }), {});
  const read = books.filter((book) => book.read).length;
  return {
    total: books.length, read, unread: books.length - read,
    averageRating: rated.length ? rated.reduce((sum, book) => sum + book.rating, 0) / rated.length : null,
    byGenre
  };
}

function checkDuplicate(book, exceptId = null) {
  if (books.some((item) => item.id !== exceptId && item.title.toLowerCase() === book.title.toLowerCase() && item.author.toLowerCase() === book.author.toLowerCase())) {
    throw httpError(409, 'A book with this title and author already exists');
  }
}

export async function createBook(body) {
  await delay();
  const book = validateBook(body);
  // No await between duplicate checking and storing, so concurrent writes cannot bypass this check.
  checkDuplicate(book);
  const created = { ...book, id: nextId };
  nextId += 1;
  books = [...books, created];
  return { ...created };
}

export async function updateBook(id, body, partial = false) {
  await delay();
  const existing = books.find((book) => book.id === id);
  if (!existing) return null;
  const valid = validateBook(body, partial ? existing : null);
  checkDuplicate(valid, id);
  const updated = { ...valid, id };
  books = books.map((book) => book.id === id ? updated : book);
  return { ...updated };
}

export async function deleteBook(id) {
  await delay();
  if (!books.some((book) => book.id === id)) return false;
  books = books.filter((book) => book.id !== id);
  return true;
}
