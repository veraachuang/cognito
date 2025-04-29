// Serverless function handler for Vercel
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

// Load environment variables from .env file when running locally
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Initialize Express app
const app = express();

// Enhanced CORS configuration for mobile and browser support
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Additional middleware to ensure CORS headers are set
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handling preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Google Sheets setup
const setupGoogleSheets = () => {
  let auth;
  
  // Use environment variables for credentials (Vercel)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      // Replace escaped newlines with actual newlines in the private key
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
      };
      
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      console.log('Using Google credentials from environment variables');
    } catch (error) {
      console.error('Error setting up credentials:', error);
    }
  } else {
    console.error('Google credentials not found in environment variables');
  }
  
  return auth;
};

// Basic health endpoint - mobile-friendly and no auth required
app.get('/api/health', (req, res) => {
  // Allow browsers to cache this response for 5 minutes
  res.set('Cache-Control', 'public, max-age=300');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] || ''),
    env: process.env.NODE_ENV || 'unknown'
  });
});

// Root route for simple ping testing
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Cognito API server is running',
    timestamp: new Date().toISOString()
  });
});

// Helper function for adding to the waitlist
const addToWaitlist = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Initialize Google Sheets API
  const auth = setupGoogleSheets();
  if (!auth) {
    throw new Error('Failed to initialize Google Sheets API');
  }
  
  // For debugging/logging
  console.log('Attempting to add email to spreadsheet:', email);
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';
  
  if (!SPREADSHEET_ID) {
    throw new Error('Spreadsheet ID is missing');
  }
  
  // Add timestamp
  const timestamp = new Date().toISOString();
  
  try {
    // Append to Google Sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[email, timestamp]]
      }
    });
    
    console.log('Successfully added to spreadsheet, response:', response.status);
    return { message: 'Successfully added to waitlist' };
  } catch (error) {
    console.error('Google Sheets API error:', error);
    throw new Error(`Google Sheets API error: ${error.message}`);
  }
};

// API route for joining waitlist - POST JSON
app.post('/api/join-waitlist', async (req, res) => {
  try {
    // Log information about the request for debugging
    console.log('POST request headers:', req.headers);
    console.log('POST request body:', req.body);
    
    const email = req.body.email;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] || '');
    
    console.log('Received waitlist request:', { email, isMobile });
    
    const result = await addToWaitlist(email);
    
    // Ensure CORS headers for the response
    res.header('Access-Control-Allow-Origin', '*');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error adding to waitlist (POST):', error);
    res.status(500).json({ error: error.message || 'Failed to add to waitlist. Please try again later.' });
  }
});

// GET route for direct fallback on mobile (supports URL params)
app.get('/api/join-waitlist', async (req, res) => {
  // If direct parameter is not set, return a simple status for connection checks
  if (!req.query.direct && !req.query.email) {
    // This is just a connection check - send a 200 OK response
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'API is healthy and accessible'
    });
  }
  
  try {
    const { email } = req.query;
    if (!email) {
      if (req.query.direct === 'true') {
        // Return an HTML form for direct submissions
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Join Cognito Waitlist</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
              h1 { color: #c82e2e; }
              input, button { display: block; width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
              button { background: #c82e2e; color: white; border: none; border-radius: 4px; cursor: pointer; }
              .success { background: #e5f5e5; border: 1px solid #c3e6c3; padding: 15px; border-radius: 4px; }
              .error { background: #ffe6e6; border: 1px solid #ffc3c3; padding: 15px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Join Cognito Waitlist</h1>
            <p>Please enter your email to join our waitlist:</p>
            <form method="GET" action="/api/join-waitlist">
              <input type="email" name="email" placeholder="Your email address" required>
              <input type="hidden" name="direct" value="true">
              <button type="submit">Join Waitlist</button>
            </form>
          </body>
          </html>
        `);
      }
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await addToWaitlist(email);
    
    // Return either JSON or HTML based on the direct parameter
    if (req.query.direct === 'true') {
      // Return an HTML success page
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Successfully Joined Cognito Waitlist</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
            h1 { color: #c82e2e; }
            .success { background: #e5f5e5; border: 1px solid #c3e6c3; padding: 15px; border-radius: 4px; }
            a.button { 
              display: inline-block; 
              background: #c82e2e; 
              color: white; 
              text-decoration: none;
              padding: 10px 20px; 
              border-radius: 4px;
              margin-top: 15px; 
            }
          </style>
        </head>
        <body>
          <h1>Thank You!</h1>
          <div class="success">
            <p>You've been added to the Cognito waitlist. We'll notify you when we're ready!</p>
            <p>Email: ${email}</p>
            <a href="https://trycognito.app" class="button">Return to Home</a>
          </div>
        </body>
        </html>
      `);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error adding to waitlist (GET):', error);
    
    // Return either JSON or HTML based on the direct parameter
    if (req.query.direct === 'true') {
      // Return an HTML error page
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Joining Cognito Waitlist</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
            h1 { color: #c82e2e; }
            .error { background: #ffe6e6; border: 1px solid #ffc3c3; padding: 15px; border-radius: 4px; }
            a.button { 
              display: inline-block; 
              background: #c82e2e; 
              color: white; 
              text-decoration: none;
              padding: 10px 20px; 
              border-radius: 4px;
              margin-top: 15px; 
            }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <div class="error">
            <p>${error.message || 'Failed to add to waitlist. Please try again later.'}</p>
            <a href="/api/join-waitlist?direct=true" class="button">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }
    
    res.status(500).json({ error: error.message || 'Failed to add to waitlist. Please try again later.' });
  }
});

// Start the server when running directly (not as a Vercel function)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`Waitlist endpoint: http://localhost:${PORT}/api/join-waitlist`);
  });
}

// Export for serverless function
module.exports = app;