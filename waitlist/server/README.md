# Waitlist Server Setup

This server handles the waitlist form submissions and adds emails to a Google Sheet.

## Google Sheets API Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API

2. **Create a Service Account**:
   - In your Google Cloud project, go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name the service account (e.g., "waitlist-service")
   - Grant the service account the "Editor" role for the project
   - Create and download the JSON key file
   - Rename the downloaded file to `credentials.json` and place it in this directory

3. **Share the Google Sheet**:
   - Open your Google Sheet (https://docs.google.com/spreadsheets/d/1p2gAguB7f2qkWgG7R5pgmXCRie4d8xG2Z9IRr63JaNw)
   - Click "Share"
   - Add the service account email (it looks like `service-account-name@project-id.iam.gserviceaccount.com`)
   - Grant "Editor" access

## Environment Variables

Create a `.env` file in this directory with the following variables:
```
PORT=3001
SPREADSHEET_ID=1p2gAguB7f2qkWgG7R5pgmXCRie4d8xG2Z9IRr63JaNw
SHEET_NAME=Sheet1
```

## Running the Server

Install dependencies:
```
npm install express cors googleapis dotenv
```

Start the server:
```
node server.js
``` 