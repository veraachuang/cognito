# Cognito JavaScript Modules

This directory contains modular components of the Cognito extension, divided by functionality to improve maintainability and readability.

## Module Structure

- **utils.js**: Utility functions used across the extension
- **google-docs-api.js**: Google Docs API integration and authentication
- **text-processor.js**: Text extraction and analysis functionality
- **layout-manager.js**: UI layout adjustments for Google Docs
- **sidebar-ui.js**: UI components for sidebar creation and management
- **outline-manager.js**: Outline generation and application
- **message-handler.js**: Manages messaging between content script and sidebar
- **index.js**: Exports all modules for easier importing

## Usage

You can import specific functionality from individual modules:

```javascript
import { debounce, cleanup } from './modules/utils.js';
import { createSidebar } from './modules/sidebar-ui.js';
```

Or import everything through the index file:

```javascript
import { debounce, createSidebar, processAndSendText } from './modules/index.js';
```

## Module Dependencies

- **utils.js**: No dependencies
- **google-docs-api.js**: No dependencies
- **text-processor.js**: No dependencies
- **layout-manager.js**: Depends on utils.js
- **sidebar-ui.js**: Depends on utils.js and layout-manager.js
- **outline-manager.js**: No dependencies
- **message-handler.js**: Depends on sidebar-ui.js, text-processor.js, and outline-manager.js 