# Logik Blueprint Admin Masterlord - Installation Guide

## Overview
The Admin Masterlord extension adds advanced blueprint version control and table detection to your Logik instance. It allows you to:
- Push blueprint versions to GitHub
- View and manage version history
- Detect which managed tables are referenced in your blueprints
- Download blueprints with version history

---

## Prerequisites

Before installing, you'll need:
1. **A GitHub account** (free or paid)
2. **Admin access to a Logik instance**
3. **A GitHub Personal Access Token (PAT)**
4. **Your Logik Admin API Key**

---

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Name it something like `logik-blueprints` or `blueprint-versions`
4. Choose **Public** or **Private** (your preference)
5. Click **Create repository**
6. Copy the repository name (e.g., `logik-blueprints`)

**Remember:** `{GitHub_Username}` and `{Repository_Name}` for later

---

## Step 2: Create a GitHub Personal Access Token (PAT)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a name: `Logik Blueprint Admin`
4. Set expiration: 90 days or never (your choice)
5. Select scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Action workflows)
6. Click **Generate token**
7. **Copy the token immediately** (you won't see it again!)

**Remember:** Save this token somewhere safe—you'll need it soon

---

## Step 3: Get Your Logik Admin API Key

1. Log in to your Logik instance as an admin
2. Go to **Admin Settings** → **API Keys** (or similar, depending on your version)
3. Create a new API key with the name `Admin Masterlord`
4. Make sure it has permissions for:
   - Read/Write Blueprints
   - Read Rules
   - Read Scripts
5. Copy the API key

**Remember:** Keep this secure—it's sensitive

---

## Step 4: Install the Extension

### Method 1: Load Unpacked (Development Mode)

1. Download or clone the extension files
2. Open **Chrome** and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Navigate to the extension folder and select it
6. The extension should now appear in your extensions list

### Method 2: Pre-built Extension (if provided)

1. Download the `.crx` file
2. Go to `chrome://extensions`
3. Drag and drop the `.crx` file onto the page
4. Click **Add extension** to confirm

---

## Step 5: Configure the Extension

1. Click the **Admin Masterlord** extension icon in your toolbar
2. Click the **gear/settings icon** (⚙️) or go to `chrome://extensions` → Admin Masterlord → **Options**
3. You'll see a settings form with three sections:

### Logik Admin API Key
- **Field:** "Logik Admin API Key"
- **Value:** Paste your Logik Admin API Key from Step 3
- Click **Save**

### GitHub Settings
Fill in all three fields:
- **GitHub Personal Access Token:** Paste your PAT from Step 2
- **GitHub Username:** Your GitHub username (not the organization name)
- **GitHub Repository:** The repository name you created in Step 1 (e.g., `logik-blueprints`)

Click **Save** when done

4. You should see a success message: "✓ All settings saved"

---

## Step 6: Test the Installation

1. Go to your Logik instance
2. Navigate to a blueprint page (e.g., `/blueprint/{blueprintName}/fields`)
3. You should see the **Admin Masterlord** icon on the right side of the screen
4. Click it to open the panel

### Verify Everything Works

**Version Control Tab:**
- Click **Push New Version**
- Enter a filename (e.g., `test-v1.zip`)
- Click **Push**
- Check your GitHub repository—a new folder should appear with your blueprint name containing the ZIP file

**Related Tables Tab:**
- Click **Scan For Tables**
- Wait for the scan to complete
- You should see a list of managed tables referenced in the blueprint's rules

---

## Troubleshooting

### "GitHub token not configured"
- Go back to settings and make sure all three GitHub fields are filled
- Click **Save**
- Refresh the Logik page

### "API Key not configured"
- Check that your Logik Admin API Key is saved in settings
- Make sure you copied the entire key (no extra spaces)

### 404 Errors on Push
- Verify your GitHub token has `repo` scope
- Verify your GitHub username is correct (not organization name)
- Verify the repository name matches exactly

### No Tables Found
- Check that the blueprint has rules with managed table lookups
- Verify table references are in `SELECT ... FROM tableName` format
- Try scanning a different blueprint to confirm the feature works

### Extension Icon Not Showing
- Refresh the page (Ctrl+R / Cmd+R)
- Make sure you're on a Logik admin page
- Check `chrome://extensions` to see if the extension is enabled

---

## Common Tasks

### Pushing a New Blueprint Version
1. Go to the blueprint page
2. Open the Admin Masterlord panel
3. Click **Version Control** tab
4. Click **Push New Version**
5. Enter a filename (optional—defaults to timestamp)
6. Click **Push**

### Viewing Version History
1. Open the Admin Masterlord panel
2. **Version Control** tab shows all pushed versions
3. Click the delete icon (🗑️) to remove old versions

### Downloading Blueprints with History
1. Go to `/blueprints` (blueprint list page)
2. Check the blueprints you want to download
3. Click **🗡️ Export** at the top
4. A ZIP will download containing organized blueprint versions

### Detecting Table Dependencies
1. Go to any blueprint page
2. Open the Admin Masterlord panel
3. Click **Related Tables** tab
4. Click **Scan For Tables**
5. View all managed tables this blueprint references

---

## Security Notes

⚠️ **Keep Your Credentials Safe:**
- Your GitHub PAT has write access to your repository
- Your Logik API Key grants admin-level access
- Never share these credentials with untrusted parties
- Consider using organization-level credentials if available

💾 **Where Credentials Are Stored:**
- All credentials are stored locally in Chrome's secure storage
- They are NOT sent to any external servers (except GitHub/Logik APIs)
- They are NOT synced across devices
- Clearing browser data may erase them

---

## Need Help?

If you encounter issues:
1. Check the browser console (F12 → Console tab) for error messages
2. Check the extension options page for configuration
3. Verify all credentials are correct and have proper permissions
4. Try refreshing the page

---

## Version Information

- **Extension Name:** Admin Masterlord
- **Current Version:** 0.1.0
- **Last Updated:** 2026-08-07
- **Supported Browsers:** Chrome/Chromium-based (MV3)

