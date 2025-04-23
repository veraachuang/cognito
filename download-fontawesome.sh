#!/bin/bash

# Create fonts directory if it doesn't exist
mkdir -p frontend/assets/fonts

# Download Font Awesome webfont
echo "Downloading Font Awesome webfont..."
curl -L -o frontend/assets/fonts/fontawesome-webfont.woff2 "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2"

echo "Font Awesome download completed." 