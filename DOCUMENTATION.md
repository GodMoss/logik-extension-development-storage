# Logik Blueprint Version Control Extension - Documentation

## Project Overview

A Chrome MV3 extension that enables version control for Logik CPQ blueprints by storing them in GitHub. The extension allows admins to push new blueprint versions, view version history, delete versions, and browse all available blueprints in their environment.

**Architecture**: Content script (Logik UI) → Service Worker (GitHub API) → GitHub Repository

---

## Features Implemented

### 1. **Blueprint Version Push**
- Click "Push New Version" button on a blueprint page
- Shows a modal with a default filename (timestamp-based)
- Allows users to customize the filename (automatically adds `.zip` if missing)
- Exports blueprint from Logik via the `/api/admin/v2/bulk/export/{jobId}` endpoint
- Uploads the ZIP file directly to GitHub (no unpacking/parsing)
- Commits the file to a blueprint-specific folder in the repo
- Auto-refreshes version list after push (with 3-second delay for GitHub indexing)

**File Structure in GitHub**:
```
{blueprintName}/blueprint-2026-08-04T20-30-45.zip
{blueprintName}/my-custom-version.zip
```

### 2. **Version History Display**
- Shows the last 10 versions for a blueprint
- Lists filename and commit date
- Sorted by date (newest first)
- Refreshes automatically after pushing (with delay for GitHub indexing)

### 3. **Manual Refresh**
- Refresh button (↻) next to "Version History" header
- Manually refreshes the version list on demand
- Shows loading animation while fetching
- Retry logic (up to 3 attempts) for GitHub API timing issues

### 4. **Delete Versions**
- Trash icon (🗑️) next to each version
- Confirmation dialog before deletion
- Calls GitHub API to delete the file
- Auto-refreshes list after successful deletion

### 5. **Blueprint List View**
- Detects when URL ends with `/blueprints` (not a specific blueprint)
- Fetches all blueprints from `/api/admin/v2/blueprints?page=0&size=100&sort=modified%2CDESC`
- Displays blueprint name and description
- Stores `variableName` for future API calls
- Different UI from version history (no push/delete on list page)

### 6. **Responsive UI**
- Side panel that slides in from the right (Salesforce Inspector-style)
- Custom icon (Sharingan WEBP image)
- Modal dialogs for user input
- Hover effects and loading animations
- Works on both blueprint list and blueprint-specific pages

---

## Technical Stack

### **Manifest** (manifest.json)
- MV3 configuration
- Content script injection: `https://*.logik.io/*`
- Host permissions: `https://api.github.com/*`
- Service worker registration
- Web-accessible resources: icon.webp

### **Content Script** (src/content.js)
- Injects side panel UI into Logik pages
- Handles blueprint export via Logik API
- Manages user input (filename modal, delete confirmation)
- Communicates with service worker via `chrome.runtime.sendMessage`
- Dynamic blueprint name extraction from URL pattern: `/blueprint/{blueprintName}/`
- Page detection (blueprint list vs specific blueprint)

### **Service Worker** (src/service-worker.js)
- Holds GitHub Personal Access Token (PAT)
- Handles GitHub API calls (upload, list versions, delete)
- Receives messages from content script, returns results
- Uses Contents API for file operations
- Manages base64 encoding of ZIP files

### **GitHub Storage**
- Storage: Personal GitHub repository
- Organization: `{blueprintName}/` folders containing ZIP files
- Each file is a complete blueprint snapshot
- Commits tracked automatically (GitHub API adds commit metadata)

---

## Issues Encountered & Resolutions

### **Issue 1: ZIP CSP Blocking**
**Problem**: Service worker couldn't load JSZip library from CDN due to Content Security Policy  
**Resolution**: Bundled jszip.min.js locally and used `importScripts()` with relative path  
**Status**: ✅ Resolved

### **Issue 2: Empty Repository 409 Errors**
**Problem**: Git Data API's tree creation returned 409 when repo was empty  
**Resolution**: Switched to Contents API for empty repos (auto-creates directory structure)  
**Status**: ✅ Resolved

### **Issue 3: ZIP File Path Parsing**
**Problem**: Simple ZIP parser returned objects with blank paths when extracting files  
**Resolution**: Pivoted to pushing entire ZIP file instead of extracting individual files (simpler & more reliable)  
**Status**: ✅ Resolved

### **Issue 4: Wrong Accept Header for ZIP Download**
**Problem**: Used `Accept: application/vnd.github.v3+json` for ZIP download, returned base64 instead of binary  
**Resolution**: Changed to `Accept: application/octet-stream`  
**Status**: ✅ Resolved

### **Issue 5: Icon Graininess**
**Problem**: JPG katana dragon icon appeared grainy  
**Resolution**: Switched to WEBP format and added CSS filters (brightness, saturate, blur)  
**Status**: ✅ Resolved

### **Issue 6: Modal Listeners Not Working**
**Problem**: Custom filename from modal wasn't being passed to service worker (came through as null)  
**Resolution**: Refactored to attach modal listeners fresh each time modal opens (vs once at startup)  
**Status**: ✅ Resolved

### **Issue 7: Refresh Button Instant (No Update)**
**Problem**: Clicking refresh immediately after pushing wouldn't show new version (GitHub hadn't indexed yet)  
**Resolution**: 
- Added 3-second delay after push before auto-refresh
- Added retry logic to refresh button (up to 3 attempts)
**Status**: ✅ Resolved

### **Issue 8: Blueprint List Page Error**
**Problem**: Tried to attach event listeners to push/refresh buttons that don't exist on blueprint list pages  
**Resolution**: Added null checks - only attach listeners if elements exist  
**Status**: ✅ Resolved

---

## Setup Instructions

### Prerequisites
1. Chrome browser with MV3 support
2. GitHub account with a personal repository
3. GitHub Personal Access Token (PAT) with `repo` scope
4. Access to Logik admin environment

### Installation
1. Clone/download the extension files
2. Edit `src/service-worker.js` and add your credentials:
   ```javascript
   const CONFIG = {
     GITHUB_TOKEN: 'your-github-pat',
     GITHUB_USERNAME: 'your-github-username',
     REPO_NAME: 'your-repo-name'
   };
   ```
3. In Chrome: `chrome://extensions/` → "Load unpacked" → select extension folder
4. Navigate to your Logik instance - the extension icon should appear

### First Run
- On a blueprint page: Click the icon, then "Push New Version" to test
- On the blueprints list page: Click the icon to see all blueprints
- Version history will show after first push

---

## Current Limitations & Future Enhancements

### Known Limitations
1. **Single PAT**: Token is hardcoded in service worker (v1 POC only)
2. **Pagination**: Blueprint list shows only first 100 (hardcoded in query)
3. **No Restore**: Can delete versions but can't restore (yet)
4. **No Diff**: No way to compare versions (yet)
5. **GitHub-only**: No support for other version control systems

### Potential Future Features
1. **Blueprint Restore**: Pull a previous version from GitHub and import into Logik
2. **Version Comparison**: Show diff between two versions
3. **Tagging**: Mark versions with release names/numbers
4. **Webhooks**: Trigger Logik imports when new files pushed to GitHub
5. **Multi-tenant Support**: Handle multiple environments from single extension
6. **Bulk Operations**: Export/import multiple blueprints at once
7. **Commit Messages**: Custom messages instead of just timestamp
8. **Branch Support**: Push to different branches (dev/staging/prod)

---

## API Endpoints Used

### Logik APIs
- `GET /api/admin/v2/bulk/export/{blueprintId}` - Submit export job
- `GET /api/admin/v2/bulk/jobs/{jobId}` - Poll export status
- `GET /api/admin/v2/bulk/export/{jobId}` - Download exported ZIP
- `GET /api/admin/v2/blueprints?page=0&size=100&sort=modified%2CDESC` - List blueprints

### Authentication Note: Session Cookies vs Bearer Tokens
**Why different endpoints require different auth:**

The export and download endpoints can be called with **session-based authentication** (cookies via `credentials: 'include'`) because they have UI counterparts in the Logik admin interface. Users interact with these features through the UI, which establishes a session.

The blueprint list endpoint, however, is a **pure API endpoint with no UI counterpart**. Since you can't retrieve a blueprint list anywhere in the admin UI, this endpoint is designed to require **explicit Bearer token authentication**. This is a common pattern:
- UI-tied endpoints → Session cookies work
- Standalone API endpoints → Require explicit Bearer token

This is why we need to store and use the Admin API Key (Bearer token) for the blueprint list, even though the export/download worked with just cookies.

### GitHub APIs
- `PUT /repos/{owner}/{repo}/contents/{path}` - Upload/create file (ZIP)
- `DELETE /repos/{owner}/{repo}/contents/{path}` - Delete file
- `GET /repos/{owner}/{repo}/commits?path={path}&per_page=100` - List commits for blueprint folder
- `GET /repos/{owner}/{repo}/commits/{sha}` - Get commit details (file list)
- `GET /repos/{owner}/{repo}/contents/{path}` - Get file metadata (SHA for deletion)

---

## Code Structure

```
logik-blueprint-es-test/
├── manifest.json              # MV3 extension config
├── src/
│   ├── content.js            # Main UI + Logik API calls
│   ├── service-worker.js     # GitHub API + file handling
│   ├── icon.webp             # Extension icon
│   └── popup.html            # Unused (superseded by side panel)
├── DOCUMENTATION.md          # This file
└── README.md                 # Basic setup
```

---

## Debugging Tips

### Enable Detailed Logging
- Browser Console (F12): Shows content script logs with `[Content Script]` prefix
- Service Worker Console (chrome://extensions → Logik Blueprint VC → "service worker"):
  - `[Service Worker]`, `[pushVersion]`, `[uploadZipToGithub]`, `[getVersions]`, `[deleteVersion]` prefixes

### Common Errors
| Error | Cause | Fix |
|-------|-------|-----|
| "GitHub token not configured" | CONFIG empty in service-worker.js | Add PAT to CONFIG |
| "Extension context invalidated" | Service worker reloaded mid-request | Retry, usually resolves |
| "Failed to load versions" | Network error or API failure | Check network tab, reload |
| "Cannot read properties of null" | Element not found | Check page type (blueprint vs list) |
| "Filename is empty" | Modal submitted without text | Modal validation blocks this |

---

## Testing Checklist

- [ ] Push new version (with default filename)
- [ ] Push with custom filename
- [ ] Custom filename auto-adds `.zip` if missing
- [ ] Version history loads and shows latest
- [ ] Refresh button works and updates list
- [ ] Delete version with confirmation
- [ ] Blueprint list page shows all blueprints
- [ ] Blueprint list displays names and descriptions
- [ ] Extension icon appears on both blueprint and list pages
- [ ] No console errors on load

---

## Session Log - 2026-08-05

### Features Added Today

1. **Settings/Options Page**
   - Created `src/options.html` with clean form UI
   - Created `src/options.js` for saving/loading credentials from `chrome.storage.local`
   - Users can now enter Logik Admin API Key and GitHub credentials securely
   - Registered in manifest as `options_page`

2. **Blueprint List View**
   - Detects when URL ends with `/blueprints` (not `/blueprint/{name}`)
   - Fetches all blueprints from Logik API: `GET /api/admin/v2/blueprints?page=0&size=100&sort=modified%2CDESC`
   - Displays blueprint name and description in a card-based list
   - Stores `variableName` in data attributes for future use

3. **Authentication Improvements**
   - Moved GitHub credentials from hardcoded `CONFIG` to `chrome.storage.local`
   - Service worker now loads credentials at startup
   - Implemented Bearer token authentication for Logik API calls
   - Added detailed logging for credential loading

4. **Auto-Update on URL Navigation**
   - Added URL polling (checks every 500ms for SPA-style navigation)
   - Added `popstate` listener for back/forward button navigation
   - Detects page type changes (blueprints ↔ versions)
   - Completely re-injects panel with correct view when page type changes
   - Preserves panel open/closed state across navigation

5. **Liquid Glass Design Overhaul**
   - Color scheme changed from blue to red/pink (#d63031, #e84393)
   - Added glassmorphism effects (backdrop-filter: blur) throughout
   - Updated toggle button, panel, header, and blueprint items
   - Gradient text for titles and buttons
   - Enhanced shadows and hover effects
   - All components now match the cohesive red/pink aesthetic

6. **Dramatic Delete Confirmation Modal**
   - Replaced browser `confirm()` with custom modal
   - Styled to match liquid glass red/pink theme
   - Header: "⚔️ Seppuku Protocol"
   - Message: "You are about to commit Seppuku. Do you wish to give [filename] an honorable death?"
   - Buttons: "Cancel" and "Honorable Death"
   - Supports Escape key and backdrop click to cancel

### Issues Caught & Resolved

| Issue | Root Cause | Resolution |
|-------|-----------|-----------|
| **403 Bad Credentials** | GitHub token wasn't being passed to service worker | Updated service worker to load credentials from chrome.storage.local and pass Bearer token header |
| **Blueprint list not loading** | API response structure was `data.content[]` not expected format | Updated to parse `data.content` array correctly |
| **Panel not auto-updating on navigation** | No URL change detection mechanism | Added URL polling (500ms) + popstate listener for SPA and full-page navigation |
| **Panel closed when navigating** | Re-injection didn't preserve open state | Added logic to check old panel's `.open` class and apply to new panel |
| **Plain delete confirmation** | Using browser's boring `confirm()` | Created custom modal with dramatic Seppuku theme |
| **Blueprint names hard to read** | Light pink gradient text blended with background | Darkened gradient from #ff6b6b/#ff8fa3 to #d63031/#e84393 |

### Technical Details

**Authentication Pattern Discovery**:
- UI-tied endpoints (export/download) work with session cookies via `credentials: 'include'`
- Standalone API endpoints (blueprint list) require explicit Bearer token
- Documented in code for future integrations

**Panel State Management**:
- Blueprint list vs version history have different DOM structures
- Partial updates don't work; complete re-injection required
- State preservation essential for good UX during SPA navigation

**Polling Strategy**:
- 500ms interval balances responsiveness vs CPU usage
- Catches both full-page navigation and SPA-style URL changes
- Combined with popstate for redundancy

## Contact & Credits

**Project**: Logik Blueprint Version Control Chrome Extension v0.1.0  
**Built with**: Chrome MV3, GitHub API, Logik API  
**Status**: MVP/POC - Fully functional with dramatic UI 🗡️  
**Last Updated**: 2026-08-05

