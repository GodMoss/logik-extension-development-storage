# Blueprint Restore Feature - Debugging Documentation

## Feature Overview
Allows users to restore prior blueprint versions from GitHub to their Logik instance via the extension. Users click a restore button next to each version, and the blueprint is automatically imported.

## The Problem

### Initial Symptoms
- Upload to Logik succeeds (job created with ID, status "STARTED")
- Job polling completes successfully (status "COMPLETED")
- Extension displays success message
- **BUT**: Blueprint does not appear in Logik
- Job result shows: `"success": false` with error message "Error importing zipped file"

### Investigation Steps

#### Step 1: Verified File Integrity
- Downloaded the same blueprint zip from GitHub manually
- Inspected the file structure - it was valid
- Manually uploaded the same file through Logik UI - it worked perfectly
- **Conclusion**: The GitHub file itself is not the problem

#### Step 2: Verified Upload Mechanism
- Confirmed FormData being used for upload
- Confirmed correct form fields (`jobType=GENERIC_IMPORT`, `file=blob`)
- Confirmed job is being created and completing
- Confirmed Bearer token authentication working
- **Conclusion**: The upload API mechanism is working correctly

#### Step 3: Discovered Size Mismatch ⚠️
Compared file sizes during different download attempts:
- **Content script download** (for user inspection): **18,456 bytes**
- **Service worker download** (for import): **26,534 bytes**
- **Key finding**: User manually uploaded the 18,456-byte file and it worked
- **Key finding**: The service worker was uploading 26,534 bytes, which failed

This was the smoking gun - **we were sending the wrong file**.

#### Step 4: Found Root Cause
Examined service worker logs:
```
[restoreVersion] Downloaded ZIP successfully, size: 26534 bytes type: application/json
```

**The problem**: GitHub API was returning **JSON metadata** with base64-encoded content, not the raw zip file.

Even though both content script and service worker used:
```javascript
'Accept': 'application/vnd.github.v3.raw'
```

GitHub was honoring this for the content script but not the service worker. Possible reasons:
- Different authentication tokens behaving differently
- Timing/caching differences
- Request construction differences

### Root Cause Analysis

When you request `/repos/{owner}/{repo}/contents/{path}` from GitHub API:
- **Without** `Accept: application/vnd.github.v3.raw`: Returns JSON with base64-encoded file content
- **With** `Accept: application/vnd.github.v3.raw`: Should return raw file content

In our case:
- Content script got the raw binary (18,456 bytes)
- Service worker got the JSON metadata (26,534 bytes with base64 content)

When we sent the 26,534-byte JSON to Logik, it couldn't parse it as a zip file → "Error importing zipped file"

### The Solution

Modified service worker to handle both response types:

```javascript
// Check what GitHub actually returned
const contentType = downloadResponse.headers.get('Content-Type');

if (contentType && contentType.includes('application/json')) {
  // GitHub returned JSON metadata with base64 content
  const metadata = await downloadResponse.json();
  const base64Content = metadata.content;
  
  // Decode base64 to binary
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  zipBlob = new Blob([bytes], { type: 'application/zip' });
} else {
  // GitHub returned raw binary
  zipBlob = await downloadResponse.blob();
}
```

**Result**: Now extracts the correct 18,456-byte zip from the JSON response, which Logik can import successfully ✅

## Key Learnings

### 1. External API Behavior Can Be Inconsistent
The `Accept` header didn't guarantee consistent behavior across different request contexts. The solution was to detect the actual response type and handle both cases.

### 2. Binary Data Handling is Tricky
Base64 decoding in JavaScript requires careful byte conversion:
- `atob()` returns a string of characters (not bytes)
- Must convert to `Uint8Array` using `charCodeAt()`
- Must wrap in correct Blob type

### 3. Size Mismatches Are a Powerful Debugging Tool
The 18,456 vs 26,534 byte discrepancy immediately pointed to the root cause. This was more effective than looking at logs or network requests.

### 4. Test with Real Data
The extension worked in isolation (API calls succeeded), but failed with real imported data (Logik validation). Testing with actual blueprint files revealed the issue.

## Files Modified

- `src/service-worker.js`: `restoreVersion()` function
  - Added Content-Type detection
  - Added base64 decoding for JSON responses
  - Maintained fallback for raw binary responses

## Commits

1. `4a6379e` - Fix: Service worker download should use blob() like content script
2. `518d70f` - Fix: Decode base64 JSON response from GitHub when raw header not honored

## Testing

✅ Restore tested with actual Logik instance
✅ Blueprint successfully imported and appears in Logik
✅ Job status polling confirmed complete with successful result
✅ Multiple restore cycles verified working

## Future Considerations

- Consider caching decoded blueprints to avoid re-decoding on repeat restores
- Add retry logic if GitHub returns unexpected response types
- Monitor if GitHub API behavior changes (if they start consistently returning raw for this endpoint)
- Consider adding checksum validation to ensure downloaded file integrity
