// Serverless function handler for Vercel
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

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

// API route for joining waitlist
app.post('/api/join-waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Initialize Google Sheets API
    const auth = setupGoogleSheets();
    if (!auth) {
      return res.status(500).json({ error: 'Failed to initialize Google Sheets API' });
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
    
    res.status(200).json({ message: 'Successfully added to waitlist' });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({ error: 'Failed to add to waitlist. Please try again later.' });
  }
});

// Export for serverless function
module.exports = app; 