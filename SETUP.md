# Step-by-Step Setup Guide

This guide walks you through getting the extension running for the first time.

## What You Should Have Ready

- [ ] Your GitHub PAT (personal access token) from earlier
- [ ] Your GitHub username: **GodMoss**
- [ ] Your repo name: **logik-blueprint-es-test**
- [ ] Chrome browser
- [ ] The folder: `C:\Users\erik.moss\logik-blueprint-es-test`

## Step 1: Add Your GitHub Token

1. Open the folder `logik-blueprint-es-test` in your code editor (VS Code, Notepad, etc.)
2. Find the file: `src/service-worker.js`
3. Look for this section at the very top:

```javascript
const CONFIG = {
  GITHUB_TOKEN: '', // TODO: Paste your GitHub PAT here
  GITHUB_USERNAME: 'GodMoss',
  REPO_NAME: 'logik-blueprint-es-test',
};
```

4. Click between the quotes on `GITHUB_TOKEN: ''` and paste your GitHub PAT
5. Save the file (Ctrl+S)

**Example** (your token will look different):

```javascript
const CONFIG = {
  GITHUB_TOKEN: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
  GITHUB_USERNAME: 'GodMoss',
  REPO_NAME: 'logik-blueprint-es-test',
};
```

## Step 2: Update Logik Domain (If Needed)

1. Find the file: `manifest.json`
2. Look for this section:

```json
"content_scripts": [
  {
    "matches": [
      "https://*.logik.io/*"
    ],
```

3. If your Logik domain is **not** a subdomain of `logik.io`, update it. For example:
   - If your Logik is at `https://mycompany.logik.io/`, **no change needed** (already covered by `*.logik.io`)
   - If your Logik is at `https://logik-prod.example.com/`, change it to `"https://logik-prod.example.com/*"`
   - If your Logik is at `https://mycompany.logik.net/`, change it to `"https://mycompany.logik.net/*"`

4. Save the file

## Step 3: Load the Extension in Chrome

1. **Open Chrome** (if not already open)
2. **Go to extensions page**: Type `chrome://extensions` in the address bar and press Enter
3. **Turn on Developer Mode**: Look for the toggle in the top-right corner and click it
4. **Click "Load unpacked"** button (should appear once Developer Mode is on)
5. **Select the folder**: Navigate to and select `C:\Users\erik.moss\logik-blueprint-es-test`
6. **Done!** The extension should now appear in your extensions list

## Step 4: Test the Extension

1. **Go to your Logik admin UI** in Chrome
2. **Click the extension icon** (should appear in the top-right, might look like a puzzle piece)
3. **You should see** a popup with "Blueprint Versions" and "Version History" sections
4. If you see an error, check the troubleshooting section below

## Step 5: Capture the Logik Export Endpoint (Critical Next Step)

Before we can push versions, we need to find out what the actual Logik export endpoint is. Here's how:

1. In the Logik admin UI, locate the export blueprint button/menu
2. **Open Chrome DevTools**: Press F12 (or right-click → Inspect)
3. **Go to Network tab** (click "Network" at the top of DevTools)
4. **Clear the current requests**: Click the circular arrow icon to clear
5. **Trigger the blueprint export** in the Logik UI (click the export button)
6. **Look for API requests** in the Network tab — you should see POST requests
7. **Click the POST request** that looks like it's exporting the blueprint (might be `/api/...`)
8. **Note down**:
   - The full URL (e.g., `/api/v1/blueprints/export`)
   - The request body (JSON that gets sent)
   - The response type (should be a ZIP file)

9. **Tell me what you find**, and I'll update the code to use the correct endpoint

## Troubleshooting

### I don't see the extension in Chrome

**Check**:
- Did you turn on Developer Mode? (chrome://extensions, toggle in top-right)
- Did you click "Load unpacked"?
- Did you select the correct folder?
- Try refreshing the page (Ctrl+R)

### The popup shows an error

**Check the error message**:
- "GitHub token not configured" → You didn't paste your token into `service-worker.js`
- "Failed to fetch versions" → Your token is wrong or doesn't have repo access
- Other → Take a screenshot and share it

### Nothing happens when I click "Push New Version"

This is expected! The feature isn't fully implemented yet. We need to:
1. Find the real Logik export endpoint (Step 5 above)
2. Implement the unzip logic
3. Test it with your Logik instance

## Next Actions

1. ✅ Complete Step 1-4 above
2. ✅ Take a screenshot showing the popup (or any error)
3. ⏭️ **Complete Step 5** (capture the export endpoint)
4. ⏭️ Tell me what you found, and we'll implement the push logic

---

**Questions?** If anything is unclear or you get stuck, let me know the exact error message or screenshot, and we'll debug it together.
