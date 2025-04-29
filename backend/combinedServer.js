const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const port = process.env.PORT || 3001;
const flaskPort = process.env.FLASK_PORT || 5000;

// Configure CORS
app.use(cors({
  origin: [
    /^chrome-extension:\/\/.*/,
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.use(express.json());

// OpenAI API key endpoint
app.get('/api/secret', (req, res) => {
  const secretKey = process.env.OPENAI_API_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: "API key not found" });
  }
  res.json({ key: secretKey });
});

// Documentation route
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Cognito API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>Cognito API Documentation</h1>
      
      <div class="endpoint">
        <h2>Get API Key</h2>
        <p><code>GET /api/secret</code></p>
        <p>Get the OpenAI API key (for authorized clients only).</p>
      </div>
      
      <div class="endpoint">
        <h2>Flask Server Endpoints</h2>
        <p>The following endpoints are proxied to the Flask server:</p>
        <ul>
          <li><code>GET /api/health</code> - Health check</li>
          <li><code>POST /api/upload</code> - Upload and analyze documents</li>
          <li><code>POST /api/generate-outline</code> - Generate an outline from text</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Setup proxy for all other /api routes to the Flask server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${flaskPort}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // keep the /api prefix
  },
  // Skip proxying for the /api/secret route (handled above)
  filter: (path) => {
    return path !== '/api/secret';
  }
}));

// Start server
app.listen(port, () => {
  console.log(`Combined server running at http://localhost:${port}`);
  console.log(`Proxying AI requests to Flask server at http://localhost:${flaskPort}`);
}); 