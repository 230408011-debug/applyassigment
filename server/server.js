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

app.listen(port, () => console.log(`Reading List API: http://localhost:${port}; client: ${clientOrigin}`));
