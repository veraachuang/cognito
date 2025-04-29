const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/.env' }); // Load .env inside backend/

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// A simple API route
app.get('/api/secret', (req, res) => {
  const secretKey = process.env.OPENAI_API_KEY;
  res.json({ key: secretKey });
});

app.listen(port, () => {
  console.log(`Tiny backend server running at http://localhost:${port}`);
});
