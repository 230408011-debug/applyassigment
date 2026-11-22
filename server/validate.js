export const genres = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];
const fields = ['title', 'author', 'year', 'genre', 'read', 'rating'];

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function parseId(value) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw httpError(400, 'Book id must be a positive integer');
  }
  return Number(value);
}

export function validateBook(body, existing = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Send a JSON object with the book fields');
  }
  // Copy only allowed fields. Client ids and unknown fields are ignored.
  const changes = Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
  const book = existing
    ? { ...existing, ...changes }
    : { read: false, rating: null, ...changes };
  for (const field of ['title', 'author']) {
    if (typeof book[field] !== 'string' || book[field].trim().length < 1 || book[field].trim().length > 100) {
      throw httpError(400, `${field} must contain 1 to 100 characters after trimming`);
    }
  }
  if (!Number.isInteger(book.year) || book.year < 1000 || book.year > new Date().getFullYear()) {
    throw httpError(400, 'year must be an integer from 1000 to the current year');
  }
  if (!genres.includes(book.genre)) throw httpError(400, 'Choose a valid genre');
  if (typeof book.read !== 'boolean') throw httpError(400, 'read must be true or false');
  if (book.rating !== null && (!Number.isInteger(book.rating) || book.rating < 1 || book.rating > 5)) {
    throw httpError(400, 'rating must be null or an integer from 1 to 5');
  }
  if (!book.read && book.rating !== null) throw httpError(400, 'Only a read book can have a rating');
  return { ...book, title: book.title.trim(), author: book.author.trim() };
}

export function validateQuery(originalUrl) {
  const params = new URL(originalUrl, 'http://localhost').searchParams;
  const allowed = ['genre', 'read', 'q', 'sort', 'order', 'limit', 'page'];
  for (const key of params.keys()) {
    if (!allowed.includes(key)) throw httpError(400, `Unknown query parameter: ${key}`);
    if (params.getAll(key).length !== 1) throw httpError(400, `Query parameter ${key} must not be repeated`);
  }
  const query = Object.fromEntries(params);
  if (query.genre !== undefined && !genres.includes(query.genre)) throw httpError(400, 'Invalid genre filter');
  if (query.read !== undefined && !['true', 'false'].includes(query.read)) throw httpError(400, 'read filter must be true or false');
  if (query.sort !== undefined && !['title', 'author', 'year', 'rating'].includes(query.sort)) throw httpError(400, 'Invalid sort field');
  if (query.order !== undefined && !['asc', 'desc'].includes(query.order)) throw httpError(400, 'order must be asc or desc');
  for (const field of ['limit', 'page']) {
    if (query[field] !== undefined && (!/^\d+$/.test(query[field]) || !Number.isSafeInteger(Number(query[field])) || Number(query[field]) < 1)) {
      throw httpError(400, `${field} must be a positive integer`);
    }
  }
  const limit = Number(query.limit ?? 50);
  const page = Number(query.page ?? 1);
  if (limit > 50) throw httpError(400, 'limit must be between 1 and 50');
  if (!Number.isSafeInteger((page - 1) * limit)) throw httpError(400, 'page is too large');
  return { ...query, limit, page, sort: query.sort ?? 'id', order: query.order ?? 'asc' };
}
