import express from 'express';
import cors from 'cors';
import * as store from './booksStore.js';
import { parseId, validateQuery } from './validate.js';

const app = express();
const port = process.env.PORT || 3000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get('/api/books', async (req, res) => {
  const query = validateQuery(req.originalUrl);
  res.json(await store.listBooks(query));
});

app.get('/api/books/:id', async (req, res) => {
  const book = await store.getBook(parseId(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.get('/api/stats', async (req, res) => {
  res.json(await store.getStats());
});

app.post('/api/books', async (req, res) => {
  const book = await store.createBook(req.body);
  res.location(`/api/books/${book.id}`).status(201).json(book);
});

app.put('/api/books/:id', async (req, res) => {
  const book = await store.updateBook(parseId(req.params.id), req.body);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.patch('/api/books/:id', async (req, res) => {
  const book = await store.updateBook(parseId(req.params.id), req.body, true);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  const deleted = await store.deleteBook(parseId(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

// Deliberate async failure for the lab's error-handling experiment (documented in README).
app.get('/api/crash', async (req, res) => {
  await Promise.resolve();
  throw new Error('Deliberate lab error');
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err.status === 413) return res.status(413).json({ error: 'JSON body is too large' });
  if ([400, 409].includes(err.status)) return res.status(err.status).json({ error: err.message });
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(port, () => console.log(`Reading List API: http://localhost:${port}; client: ${clientOrigin}`));
