import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

const courses = [
  { id: 'WEB101', title: 'Web Foundations', credits: 5 },
  { id: 'JS102', title: 'JavaScript Basics', credits: 6 },
  { id: 'NODE201', title: 'Introduction to Back-end Development', credits: 5 }
];

// These run before static files and routes, so every request is included.
let requestsServed = 0;

function requestLogger(req, res, next) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
}

function requestCounter(req, res, next) {
  requestsServed += 1;
  next();
}

app.use(requestLogger);
app.use(requestCounter);

app.get('/hello', (req, res) => {
  res.type('text/plain').send("Hello from Özcan Öztürk's server");
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n');
});

app.get('/old-page', (req, res) => {
  res.redirect(302, '/hello');
});

app.get('/api/courses', (req, res) => {
  res.json(courses);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    nodeVersion: process.version,
    uptimeSeconds: process.uptime()
  });
});

app.get('/api/headers', (req, res) => {
  // Create a response object without changing req.headers.
  res.json({
    'user-agent': req.get('User-Agent') || null,
    accept: req.get('Accept') || null
  });
});

app.post('/api/subscribe', (req, res) => {
  res.status(201).json({ subscribed: true });
});

app.get('/api/admin', (req, res) => {
  res.status(403).json({ error: 'Forbidden' });
});

app.get('/api/stats', (req, res) => {
  res.json({ requestsServed });
});

app.listen(port, () => {
  console.log(`Study programme server: http://localhost:${port}`);
});
