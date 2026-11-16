import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

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

app.listen(port, () => {
  console.log(`Study programme server: http://localhost:${port}`);
});
