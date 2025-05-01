#!/bin/bash

# Script to package the Cognito Chrome extension for Chrome Web Store submission
echo "🔧 Packaging Cognito Chrome extension for Chrome Web Store submission..."

# Ensure we're in the root directory
cd "$(dirname "$0")"

# 1. Clean up any existing dist folder if it exists
echo "🧹 Cleaning up existing dist folder..."
rm -rf dist_package
mkdir -p dist_package

# 2. Copy the necessary files from dist to the new package folder
echo "📋 Copying extension files to package folder..."
cp -r dist/* dist_package/

# 3. Create assets directory and copy icons if needed
echo "🖼️ Ensuring icons are properly included..."
mkdir -p dist_package/assets
cp -r frontend/assets/* dist_package/assets/

# 4. Update any development/localhost URLs in JS files to production URLs
echo "🔄 Updating development URLs to production URLs..."
# Backup original files before replacement
for file in dist_package/*.js; do
  cp "$file" "${file}.backup"
done

# Replace localhost URLs
# Update with your production endpoint URLs
sed -i.bak 's|http://localhost:5003/api|https://api.trycognito.app/api|g' dist_package/*.js
sed -i.bak 's|http://localhost:5000|https://api.trycognito.app|g' dist_package/*.js
sed -i.bak 's|http://localhost:3001|https://api.trycognito.app|g' dist_package/*.js

# 5. Process manifest.json and fix all issues
echo "🔄 Updating manifest.json..."
cp dist_package/manifest.json dist_package/manifest.json.backup

# First create a clean manifest without problematic fields
echo "   - Removing restricted fields and fixing formatting issues..."
TMP_FILE=$(mktemp)
jq '
  # Remove key field (not allowed in Chrome Web Store)
  del(.key) |
  # Ensure host_permissions are valid and clean
  .host_permissions = (.host_permissions | map(select(. != null and . != "")))
' dist_package/manifest.json > "$TMP_FILE"

# Fix URLs in the CSP
echo "   - Updating Content Security Policy..."
TMP_FILE2=$(mktemp)
jq --arg apiurl "https://api.trycognito.app" '
  .content_security_policy.extension_pages = 
    (.content_security_policy.extension_pages | 
      gsub("http://localhost:[0-9]+"; $apiurl) | 
      gsub($apiurl + " " + $apiurl; $apiurl))
' "$TMP_FILE" > "$TMP_FILE2"

# If jq is not available or failed, fallback to sed
if [ $? -ne 0 ]; then
  echo "   - Falling back to sed for manifest updates..."
  TMP_FILE2=$(mktemp)
  # Remove the key field
  sed '/"key": /d' dist_package/manifest.json |
  # Remove localhost from host_permissions
  sed 's|"http://localhost:5000/\*",||g' |
  # Remove any empty lines in arrays
  sed '/\[\s*$/,/\s*\]/s/^\s*$//g' |
  # Update CSP to use production URLs
  sed 's|http://localhost:5000|https://api.trycognito.app|g' |
  sed 's|http://localhost:3001|https://api.trycognito.app|g' |
  # Fix duplicate API URLs in CSP
  sed 's|https://api.trycognito.app https://api.trycognito.app|https://api.trycognito.app|g' > "$TMP_FILE2"
fi

# Move the processed manifest back
mv "$TMP_FILE2" dist_package/manifest.json
rm -f "$TMP_FILE"

# Clean up backup files
rm dist_package/*.bak

# 6. Verify manifest.json has all required fields
echo "✅ Verifying manifest.json..."
if ! grep -q "\"icons\"" dist_package/manifest.json; then
  echo "⚠️  Warning: manifest.json is missing icons section! Fix this before submission."
fi

# 7. Create the ZIP file for submission
echo "📦 Creating ZIP archive for Chrome Web Store submission..."
zip_name="cognito-extension-$(date +%Y%m%d).zip"
( cd dist_package && zip -r "../$zip_name" . -x "*.DS_Store" "*.backup" )

echo "✨ Package created: $zip_name"
echo ""
echo "📋 Chrome Web Store Submission Checklist:"
echo "1. Upload $zip_name to Chrome Web Store"
echo "2. Ensure you have screenshots and promotional images ready"
echo "3. Provide detailed description and privacy policy URL"
echo "4. Verify all URLs are production (not localhost)"
echo "5. Test your uploaded package before submitting for review"

exit 0 