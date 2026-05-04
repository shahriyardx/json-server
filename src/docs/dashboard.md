---
title: Dashboard
slug: dashboard
order: 6
---

# Dashboard

The dashboard is your control panel for managing JSON files.

## Overview

The landing page shows your usage at a glance:

- **Stat cards** — files uploaded, storage used, requests this month, API key count
- **7-day request chart** — daily request volume across all files with a bar chart
- **Side stats** — total versions across all files, trash count (linked to Trash), storage breakdown by JSON type (arrays vs objects vs primitives)
- **Quick actions** — one-click links to Upload, My JSONs, API Keys, Trash
- **Recent files** — last 5 files with timestamps, linked to their edit pages

## My JSONs

Lists all uploaded files with search, sort, and management actions. Supports list and grid view modes.

### Search

Use the search bar to filter files by filename or content. Search is debounced — results update 300ms after you finish typing.

### Filter & Sort

- **Sort**: newest, oldest, name A-Z, name Z-A, size ascending, size descending
- **Type filter**: all files, arrays only, objects only
- **Size filter**: all, small (<1KB), medium (1KB–10KB), large (>10KB)

### File Actions

Each file displays filename, size, creation date, and content type badge. Actions available:

- **Copy URL** — copies `https://json.shahriyar.dev/<username>/<filename>` to clipboard
- **Download** — downloads the file as `.json`
- **Docs** — opens API documentation for the file
- **Explore** — opens the JSON data browser
- **Analytics** — opens request volume chart with referrer breakdown
- **Versions** — opens version history
- **Edit** — opens the editor with webhook configuration
- **Toggle visibility** — switch between public and private
- **Delete** — moves the file to trash (with confirmation)

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

Use API keys to access private files. All requests count toward the 100k/month limit regardless of authentication.

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

- JSON text editor with pre-filled content, validated with zod on submit
- Filename editing with validation
- Public/private toggle
- **Shape indicator** — shows the JSON structure (e.g. "Array(15) of object") with file size
- Real-time URL preview as you type

### Webhooks

The edit page includes webhook configuration for each file:

- **Add webhook** — enter a URL to receive POST notifications when the file is updated
- **View secret** — copy the HMAC-SHA256 signing secret (shown once, then masked)
- **Regenerate secret** — rotate the signing secret
- **Toggle on/off** — enable or disable without losing configuration
- **Delete webhook** — remove the webhook entirely
- **Delivery status** — shows last delivery timestamp, HTTP response code, and success/failure status

Webhook payloads are sent as `POST` with `Content-Type: application/json` and include:
- `X-Webhook-Signature: sha256=<hmac>` header for payload verification
- `X-Webhook-Event: file.updated` header for event type identification

## Analytics

Navigate to **Analytics** on any file to view request data:

- **30-day request total** with daily average
- **Top referrer** — the most common `Referer` domain across all requests
- **Daily bar chart** — request volume per day for the last 30 days
- Referrer breakdown per day visible in tooltips

Analytics are collected automatically when the public API is accessed. Data starts populating after the first request to a file.

## Trash

Navigate to **Trash** in the sidebar to manage deleted files:

- **Restore** — move a file back to active files. Fails if a file with the same name exists
- **Permanently Delete** — removes the file and all versions forever
- Files show deletion date alongside file size
- Empty trash state with clear messaging
- Confirmation dialog before each action (restore or permanent delete)
