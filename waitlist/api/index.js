// Serverless function handler for Vercel
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

// Initialize Express app
const app = express();

// More permissive CORS configuration for mobile and browser support
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

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
      const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';
  
  // Add timestamp
  const timestamp = new Date().toISOString();
  
  // Append to Google Sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:B`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[email, timestamp]]
    }
  });
  
  return { message: 'Successfully added to waitlist' };
};

// API route for joining waitlist - POST JSON
app.post('/api/join-waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await addToWaitlist(email);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error adding to waitlist (POST):', error);
    res.status(500).json({ error: error.message || 'Failed to add to waitlist. Please try again later.' });
  }
});

// GET route for direct fallback on mobile (supports URL params)
app.get('/api/join-waitlist', async (req, res) => {
  // If direct parameter is not set, return a simple status for connection checks
  if (!req.query.direct) {
    // This is just a connection check
    return res.status(200).json({ status: 'ok' });
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
          </style>
        </head>
        <body>
          <h1>Thank You!</h1>
          <div class="success">
            <p>You've been added to the Cognito waitlist. We'll notify you when we're ready!</p>
            <p>Email: ${email}</p>
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
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <div class="error">
            <p>${error.message || 'Failed to add to waitlist. Please try again later.'}</p>
            <a href="/api/join-waitlist?direct=true">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }
    
    res.status(500).json({ error: error.message || 'Failed to add to waitlist. Please try again later.' });
  }
});

// Export for serverless function
module.exports = app; 