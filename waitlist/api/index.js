// Serverless function entry point for Vercel
const path = require('path');
const fs = require('fs');

// Import the server logic from the server directory
const serverPath = path.join(process.cwd(), 'server', 'server.js');

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  console.error(`Server file not found at: ${serverPath}`);
}

// Import the server (using require to avoid module issues)
const serverModule = require(serverPath);

// Export the Express app as the serverless function handler
module.exports = serverModule; 