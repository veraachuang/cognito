#!/bin/bash

# Start the Flask server in the background
echo "Starting Flask server..."
cd "$(dirname "$0")" # Make sure we're in the right directory
python -m src.app &
FLASK_PID=$!

# Give Flask a moment to start
sleep 2

# Start the Express proxy server
echo "Starting Express proxy server..."
node combinedServer.js

# Cleanup function to kill the Flask server when the script is interrupted
cleanup() {
  echo "Shutting down servers..."
  kill $FLASK_PID
  exit 0
}

# Trap ctrl-c and call cleanup
trap cleanup INT TERM

# Wait for both processes
wait 