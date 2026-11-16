import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello', (req, res) => {
  res.type('text/plain').send("Hello from Özcan Öztürk's server");
});

app.listen(port, () => {
  console.log(`Study programme server: http://localhost:${port}`);
});
