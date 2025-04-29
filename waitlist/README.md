# Cognito Waitlist

A waitlist application for the Cognito Chrome extension.

## Features

- React frontend with TypeScript and Tailwind CSS
- Express backend with Google Sheets API integration
- Automated email collection to Google Sheets

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm

### Frontend Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following content:
   ```
   VITE_API_URL=http://localhost:3001
   ```

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Google Cloud project and service account (see server/README.md)
4. Create and set up the `credentials.json` file
5. Create a `.env` file with the following content:
   ```
   PORT=3001
   SPREADSHEET_ID=1p2gAguB7f2qkWgG7R5pgmXCRie4d8xG2Z9IRr63JaNw
   SHEET_NAME=Sheet1
   ```

## Running the Application

### Development Mode (Frontend + Backend)

```
npm run dev:all
```

This will start both the frontend development server and the backend API server.

### Frontend Only

```
npm run dev
```

### Backend Only

```
npm run server
```

### Production Mode

```
npm run start
```

This will build the frontend and start the production server.

## Google Sheets Integration

The application collects email addresses from the waitlist form and adds them to a Google Sheet with timestamps.

1. When a user submits their email in the waitlist form, the frontend sends a POST request to the backend API.
2. The backend validates the email and uses the Google Sheets API to add the email and timestamp to the specified Google Sheet.
3. The Google Sheet is automatically updated with the new entry.

See the `server/README.md` for detailed setup instructions for Google Sheets API integration. 