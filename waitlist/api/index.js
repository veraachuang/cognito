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
  maxAge: 86400, // Cache preflight requests for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional middleware to ensure CORS headers are set
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handling preflight OPTIONS requests more aggressively
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(204).set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
      'Content-Length': '0'
    }).end();
  }
  
  next();
});

// Implement a special handler for redirection issues
app.use((req, res, next) => {
  // If the host is trycognito.app without www, redirect with CORS headers
  const host = req.headers.host || '';
  if (host === 'trycognito.app') {
    const newUrl = `https://www.trycognito.app${req.originalUrl}`;
    console.log(`Redirecting ${req.method} request from ${host} to www subdomain: ${newUrl}`);
    
    // Set CORS headers before redirecting
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    });
    
    return res.redirect(308, newUrl);
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
  
  console.log('Setting up Google Sheets...');
  
  // Use environment variables for credentials (Vercel)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      console.log('Google credentials found in environment variables');
      
      // Check if the private key looks valid (should have the right format)
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        console.error('Private key appears to be malformed - missing BEGIN/END markers');
        console.log('Private key length:', privateKey.length);
        console.log('First 20 chars:', privateKey.substring(0, 20) + '...');
        throw new Error('Private key is malformed');
      }
      
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
      
      // Check for missing required fields
      const requiredFields = ['project_id', 'private_key_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required credential fields:', missingFields);
        throw new Error(`Missing credential fields: ${missingFields.join(', ')}`);
      }
      
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      console.log('Successfully created Google auth object');
      return auth;
    } catch (error) {
      console.error('Error setting up Google credentials:', error.message);
      console.error('Stack trace:', error.stack);
      // Return null so calling code can handle the error appropriately
      return null;
    }
  } else {
    console.error('Google credentials not found in environment variables');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('GOOGLE')));
    return null;
  }
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

// Add a diagnostic route to check environment variables and Google Sheets connection
app.get('/api/diagnostic', (req, res) => {
  // Don't expose full environment variables in production
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    SPREADSHEET_ID: process.env.SPREADSHEET_ID ? 'Set' : 'Not set',
    SHEET_NAME: process.env.SHEET_NAME ? 'Set' : 'Not set',
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Not set',
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'Set (length: ' + 
      (process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0) + ')' : 'Not set',
    GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Not set',
  };
  
  // Test Google Sheets auth setup
  let authStatus = 'Not tested';
  try {
    const auth = setupGoogleSheets();
    authStatus = auth ? 'Authentication object created successfully' : 'Failed to create auth object';
  } catch (error) {
    authStatus = 'Error creating auth: ' + error.message;
  }
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    envVars: safeEnv,
    authStatus: authStatus,
    // Include simple server info
    server: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime()
    }
  });
});

// Helper function for adding to the waitlist
const addToWaitlist = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }
  
  console.log('Starting waitlist process for email:', email);
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Check environment variables first
  if (!process.env.SPREADSHEET_ID) {
    console.error('SPREADSHEET_ID environment variable is missing');
    throw new Error('Configuration error: Spreadsheet ID is missing');
  }
  
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error('Google credentials missing:', {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL ? 'Present' : 'Missing',
      privateKey: process.env.GOOGLE_PRIVATE_KEY ? 'Present' : 'Missing'
    });
    throw new Error('Configuration error: Google credentials are missing');
  }
  
  // Initialize Google Sheets API
  const auth = setupGoogleSheets();
  if (!auth) {
    console.error('Failed to create Google auth object');
    throw new Error('Failed to initialize Google Sheets API');
  }
  
  // For debugging/logging
  console.log('Auth created, attempting to add email to spreadsheet:', email);
  
  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';
  
  // Add timestamp
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`Sending request to Google Sheets API - Spreadsheet ID: ${SPREADSHEET_ID}, Sheet: ${SHEET_NAME}`);
    
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
    
    console.log('Google Sheets API response:', {
      statusCode: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    if (response.status !== 200) {
      throw new Error(`Google Sheets API returned status ${response.status}: ${response.statusText}`);
    }
    
    return { 
      message: 'Successfully added to waitlist',
      email: email,
      timestamp: timestamp
    };
  } catch (error) {
    console.error('Google Sheets API error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errors: error.errors || 'No error details',
    });
    
    if (error.response) {
      console.error('Google API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    throw new Error(`Google Sheets API error: ${error.message}`);
  }
};

// API route for joining waitlist - POST JSON
app.post('/api/join-waitlist', async (req, res) => {
  try {
    // Log information about the request for debugging
    console.log('POST request headers:', req.headers);
    console.log('POST request body:', req.body);
    
    // Safeguard against undefined email
    let email = null;
    
    // Check where the email might be
    if (req.body && typeof req.body === 'object') {
      email = req.body.email;
    } else if (typeof req.body === 'string') {
      // Try to parse the body if it's a string
      try {
        const parsedBody = JSON.parse(req.body);
        email = parsedBody.email;
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
    
    // Still no email? Check query params as a last resort
    if (!email && req.query && req.query.email) {
      email = req.query.email;
    }
    
    // Give up if we still don't have an email
    if (!email) {
      return res.status(400).json({ error: 'Email is required but was not found in request' });
    }
    
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