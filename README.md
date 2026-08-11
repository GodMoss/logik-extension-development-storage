# Logik Blueprint Version Control - Chrome Extension

A Chrome extension for storing Logik CPQ blueprint versions in GitHub with version history.

## Setup

### 1. Get Your GitHub PAT

You should already have generated a personal access token from GitHub. If not:
1. Go to github.com → Profile → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Name it "Logik Blueprint Extension"
4. Check the `repo` scope
5. Copy the token (you won't see it again!)

### 2. Configure the Extension

Open `src/service-worker.js` and find the CONFIG section at the top:

```javascript
const CONFIG = {
  GITHUB_TOKEN: '', // PASTE YOUR TOKEN HERE
  GITHUB_USERNAME: 'GodMoss',
  REPO_NAME: 'logik-blueprint-es-test',
};
```

Paste your GitHub PAT between the quotes on the GITHUB_TOKEN line. **Keep this file private** — don't commit it to public repos.

### 3. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Navigate to this folder and select it
5. The extension should now appear in your extensions list

### 4. Provide Your Logik Instance Domain

In `manifest.json`, find this line:

```json
"matches": [
  "https://*.logik.io/*"
]
```

Replace `logik.io` with your actual Logik domain if different. For example:
- `"https://mycompany.logik.io/*"`
- `"https://staging.logik.io/*"`

## How to Use

### Viewing Version History

1. Go to your Logik admin UI
2. Click the extension icon (puzzle piece in top-right)
3. The popup shows all versions in GitHub, sorted by date
4. Each version shows the commit hash (first 7 characters) and timestamp

### Pushing a New Version

1. In the extension popup, click "Push New Version"
2. The extension will:
   - Export the current blueprint from Logik
   - Unzip it
   - Commit it to GitHub
3. Check your GitHub repo to see the new commit with all blueprint files

### (Future) Restoring a Version

- Not yet implemented in v1
- Will allow clicking a version to restore it to Logik

## Troubleshooting

### "GitHub token not configured"

Make sure you pasted your PAT into `src/service-worker.js` in the CONFIG section.

### Extension doesn't appear in Logik admin UI

- Check that your Logik domain is correct in `manifest.json`
- Make sure you're logged into Logik with an admin account
- Try hard-refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Push fails with "Export failed"

The content script couldn't call Logik's export endpoint. This likely means:
- The endpoint URL in `src/content.js` is incorrect
- Your Logik instance doesn't have the export API enabled

**Next step**: Use browser dev tools to capture the actual export request (see below).

## Capturing Logik Network Requests

To find the correct Logik export/import endpoints:

1. Open Logik admin UI
2. Open browser dev tools (F12 → Network tab)
3. Trigger a blueprint export or import action in the Logik UI
4. Look for POST requests to `/api/*` endpoints
5. Right-click the request → Copy as cURL
6. Update the endpoint URLs in:
   - `src/content.js` (exportBlueprint function)
   - `src/utils/logik-api.js` (exportBlueprint function)

Document what you find so we can update the code.

## Project Structure

```
logik-blueprint-es-test/
├── manifest.json           # Extension configuration (MV3)
├── src/
│   ├── popup.html          # Admin panel UI
│   ├── popup.js            # Admin panel logic
│   ├── content.js          # Injected into Logik UI
│   ├── service-worker.js   # Background process (handles GitHub API)
│   └── utils/
│       ├── github-api.js   # GitHub API helpers
│       └── logik-api.js    # Logik API helpers
├── images/                 # Extension icons (TODO)
└── README.md               # This file
```

## Next Steps

1. **Configure GitHub token** in `src/service-worker.js`
2. **Load extension** in Chrome (`chrome://extensions`)
3. **Capture Logik export endpoint** using browser dev tools
4. **Test the push flow** with a real Logik instance
5. **Iterate on unzip/commit logic** once endpoints are confirmed

## Notes

- This is a POC for a single Logik admin per GitHub account
- GitHub token is stored in the extension code (not production-safe, fine for testing)
- No backend required — GitHub API is the storage layer
- Restore flow not yet implemented (planned for v2)
