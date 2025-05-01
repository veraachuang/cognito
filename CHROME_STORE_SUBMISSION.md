# Chrome Web Store Submission Guide

This document provides instructions for packaging and submitting the Cognito extension to the Chrome Web Store.

## Packaging the Extension

1. Run the packaging script to create a store-ready ZIP file:

```bash
./package-for-store.sh
```

This script will:
- Create a clean package in the `dist_package` directory
- Copy all required files from `dist`
- Add necessary icons from `frontend/assets`
- Remove development URLs and replace them with production URLs
- Remove the `key` field from manifest.json (not allowed in store submissions)
- Fix any formatting issues in the manifest
- Create a ZIP file named `cognito-extension-YYYYMMDD.zip`

## Submission Requirements

When submitting to the Chrome Web Store, you will need:

1. **ZIP File**: Use the ZIP file created by the packaging script.

2. **Screenshots**: 
   - Minimum 1, maximum 5 screenshots (1280x800 or 640x400)
   - These should show the extension in action

3. **Store Icon**:
   - 128x128 PNG icon (already included in the package)

4. **Promotional Images** (optional but recommended):
   - Small: 440x280 PNG/JPEG
   - Large: 920x680 PNG/JPEG

5. **Description**:
   - Short description (132 characters max)
   - Detailed description

6. **Privacy Policy URL**:
   - Required because the extension requests sensitive permissions
   - Must explain data collection and usage

## Common Issues

### Key Field Error

If you see "key field is not allowed in manifest", it means:
- The `key` field wasn't properly removed from manifest.json
- Run the packaging script again or manually remove the key field

### Localhost URLs

Ensure all localhost URLs have been replaced with production URLs in:
- JavaScript files
- manifest.json (especially in content_security_policy)

### Missing or Invalid Icons

Make sure all icons are properly referenced in the manifest.json and included in the package.

## Testing Before Submission

Before final submission:
1. Unpack the ZIP file and load the unpacked extension in Chrome
2. Verify all functionality works correctly
3. Check the manifest.json for any errors

## After Submission

After submission, the extension will go through the Chrome Web Store review process which typically takes 2-3 business days. You'll receive an email when the review is complete. 