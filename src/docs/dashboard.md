---
title: Dashboard
slug: dashboard
order: 6
---

# Dashboard

The dashboard is your control panel for managing JSON files.

## My JSONs

Lists all uploaded files with search, download, and management actions.

### Search

Use the search bar to filter files by filename or content. Search is debounced — results update after you finish typing.

### File Cards

Each file displays:

- **Filename** with `.json` extension and a public/private lock icon
- **File size** and creation date
- Action buttons:
  - **Copy URL** — copies `https://json.shahriyar.dev/<username>/<filename>` to clipboard
  - **Download** — downloads the file as `.json`
  - **Docs** — opens API documentation for the file
  - **Explore** — opens the JSON data browser
  - **Versions** — opens version history
  - **Edit** — opens the editor
  - **Delete** — removes the file (with confirmation)

### Export All ZIP

Click **Export All ZIP** in the page header to download all files as a single ZIP archive.

## Upload

Two upload modes:

### File Mode
- Drag-and-drop a `.json` file or click to browse
- Filename editing
- URL preview before upload
- On success: URL auto-copied, redirect to My JSONs

### Paste Mode
- Switch to the **Paste** tab
- Type or paste JSON content directly
- Real-time JSON validation with error feedback
- Dragging a file onto the textarea loads its content

## API Keys

Navigate to **API Keys** in the sidebar to manage API authentication.

- **Create Key** — give it a name, get a `js_` prefixed plain-text key (shown once)
- **Revoke Key** — permanently invalidate a key
- **Limit** — up to 10 API keys per account

Use API keys to access private files or bypass monthly rate limits.

## JSON Data Browser

Navigate to **Explore** on any file to browse its content:

- **Arrays of objects** — sortable, filterable table with pagination (20 rows/page)
- **Nested objects** — expandable tree view with collapse/expand toggles
- **Primitive arrays** — simple list view

## Version History

Navigate to **Versions** on any file to view change history:

- **Latest Version** — always shown at top with an Edit button
- **Old Versions** — listed chronologically with timestamps and sizes
- **View Diff** — side-by-side comparison of current vs selected version
- **Revert** — restores the file to the selected version. The current content is saved as a version before reverting
- **Limit** — up to 50 versions per file; oldest versions are trimmed automatically

## Edit Page

The editor lets you modify file content with:

- JSON text editor with pre-filled content
- **Size Chart** — a line chart showing file size across versions (appears when multiple versions exist)
