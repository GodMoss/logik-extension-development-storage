// Configuration - will be loaded from chrome.storage.local at runtime
let CONFIG = {
  GITHUB_TOKEN: null,
  GITHUB_USERNAME: null,
  REPO_NAME: null
};

// Promise that resolves when credentials are loaded
let credentialsReady = new Promise((resolve) => {
  chrome.storage.local.get(['githubToken', 'githubUsername', 'githubRepo'], (data) => {
    if (data.githubToken && data.githubUsername && data.githubRepo) {
      CONFIG.GITHUB_TOKEN = data.githubToken;
      CONFIG.GITHUB_USERNAME = data.githubUsername;
      CONFIG.REPO_NAME = data.githubRepo;
      console.log('[Service Worker] GitHub credentials loaded from storage');
      console.log('[Service Worker] GitHub User:', CONFIG.GITHUB_USERNAME);
      console.log('[Service Worker] GitHub Repo:', CONFIG.REPO_NAME);
    } else {
      console.error('[Service Worker] GitHub credentials not found in storage. Please configure in extension settings.');
    }
    resolve();
  });
});

async function ensureCredentials() {
  await credentialsReady;
  if (!CONFIG.GITHUB_TOKEN) {
    throw new Error('GitHub token not configured. Please set it in extension options.');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Service Worker] Message received:', request.action);

  if (request.action === 'pushVersion') {
    console.log('[Service Worker] Starting pushVersion with ZIP size:', request.blueprintZip?.data?.length);
    console.log('[Service Worker] Full request:', { blueprintName: request.blueprintName, customFilename: request.customFilename });
    pushVersion({
      data: request.blueprintZip.data,
      blueprintName: request.blueprintName,
      customFilename: request.customFilename
    })
      .then((result) => {
        console.log('[Service Worker] Push succeeded:', result);
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error('[Service Worker] Push failed:', error);
        sendResponse({ error: error.message });
      });

    return true; // Keep channel open for async
  }

  if (request.action === 'getVersions') {
    console.log('[Service Worker] getVersions requested for:', request.blueprintName);
    getVersions(request.blueprintName)
      .then((versions) => {
        console.log('[Service Worker] getVersions returning', versions.length, 'versions');
        sendResponse({ versions });
      })
      .catch((error) => {
        console.error('[Service Worker] getVersions error:', error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.action === 'deleteVersion') {
    console.log('[Service Worker] deleteVersion requested:', request.filename);
    deleteVersion(request.blueprintName, request.filename, request.sha)
      .then((result) => {
        console.log('[Service Worker] deleteVersion succeeded');
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error('[Service Worker] deleteVersion error:', error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.action === 'bulkDownload') {
    console.log('[Service Worker] bulkDownload requested for:', request.blueprintNames);
    bulkDownload(request.blueprintNames)
      .then((data) => {
        console.log('[Service Worker] bulkDownload succeeded, data:', data);
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('[Service Worker] bulkDownload error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errorMsg || 'Unknown error' });
      });

    return true;
  }

  if (request.action === 'restoreVersion') {
    console.log('[Service Worker] restoreVersion requested for:', request.filename);
    restoreVersion(request.blueprintName, request.filename)
      .then((result) => {
        console.log('[Service Worker] restoreVersion succeeded');
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error('[Service Worker] restoreVersion error:', error);
        sendResponse({ error: error.message });
      });

    return true;
  }
});

async function pushVersion(blueprintZipData) {
  try {
    console.log('[pushVersion] Starting...');

    // Ensure credentials are loaded
    await ensureCredentials();

    // Convert array back to blob
    const blob = new Blob([new Uint8Array(blueprintZipData.data)], {
      type: 'application/zip',
    });
    console.log('[pushVersion] Created blob, size:', blob.size);

    const commitMessage = `Blueprint version push from ${new Date().toISOString()}`;

    // Get blueprint name and custom filename from the content script message
    const blueprintName = blueprintZipData.blueprintName || 'unknown';
    const customFilename = blueprintZipData.customFilename || null;

    // Upload ZIP file directly to GitHub
    console.log('[pushVersion] Uploading ZIP to GitHub for blueprint:', blueprintName, 'with custom filename:', customFilename);
    const commitSha = await uploadZipToGithub(blob, commitMessage, blueprintName, customFilename);

    return { success: true, commitSha, filesCommitted: 1 };
  } catch (error) {
    throw new Error(`Push failed: ${error.message}`);
  }
}

async function createGitHubCommit(fileTree, message) {
  // Step 1: Create a tree from the files
  const treeResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/git/trees`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        tree: fileTree.map((f) => ({
          path: f.path,
          mode: f.mode,
          type: f.type,
          content: f.content,
        })),
      }),
    }
  );

  if (!treeResponse.ok) {
    const error = await treeResponse.text();
    // For empty repos, try creating individual blobs instead
    if (treeResponse.status === 409) {
      console.log('[GitHub] Repo is empty, creating blobs and tree manually');
      return await createInitialCommit(fileTree, message);
    }
    throw new Error(
      `Failed to create tree: ${treeResponse.statusText} - ${error}`
    );
  }

  const { sha: treeSha } = await treeResponse.json();

  // Step 2: Get the latest commit SHA to use as parent
  let parentSha = null;
  try {
    const refResponse = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/git/refs/heads/main`,
      {
        headers: {
          Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (refResponse.ok) {
      const ref = await refResponse.json();
      parentSha = ref.object.sha;
    }
  } catch (e) {
    console.log('No existing commits yet, creating initial commit');
  }

  // Step 3: Create the commit
  const commitPayload = {
    message: message,
    tree: treeSha,
    author: {
      name: 'Logik Blueprint Extension',
      email: 'logik-ext@example.com',
      date: new Date().toISOString(),
    },
  };

  if (parentSha) {
    commitPayload.parents = [parentSha];
  }

  const commitResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/git/commits`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(commitPayload),
    }
  );

  if (!commitResponse.ok) {
    const error = await commitResponse.text();
    throw new Error(
      `Failed to create commit: ${commitResponse.statusText} - ${error}`
    );
  }

  const { sha: commitSha } = await commitResponse.json();

  // Step 4: Update the main branch ref to point to the new commit
  const refResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/git/refs/heads/main`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        sha: commitSha,
        force: false,
      }),
    }
  );

  if (!refResponse.ok) {
    // If update fails because the ref doesn't exist, create it
    if (refResponse.status === 422) {
      const createRefResponse = await fetch(
        `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/git/refs`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            ref: 'refs/heads/main',
            sha: commitSha,
          }),
        }
      );

      if (!createRefResponse.ok) {
        const error = await createRefResponse.text();
        throw new Error(
          `Failed to create ref: ${createRefResponse.statusText} - ${error}`
        );
      }
    } else {
      const error = await refResponse.text();
      throw new Error(
        `Failed to update ref: ${refResponse.statusText} - ${error}`
      );
    }
  }

  return commitSha;
}

// UTF-8 to Base64 encoder (handles Unicode characters)
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function uploadZipToGithub(blob, message, blueprintName, customFilename) {
  // Upload ZIP file to a blueprint-specific folder
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Convert bytes to base64
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Content = btoa(binary);

  // Use custom filename if provided, otherwise create timestamp-based filename
  const filename = customFilename || `blueprint-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
  const filepath = `${blueprintName}/${filename}`;

  console.log('[uploadZipToGithub] Custom filename provided:', customFilename);
  console.log('[uploadZipToGithub] Final filename being used:', filename);
  console.log('[uploadZipToGithub] Uploading', filepath, 'to GitHub');

  // Check if file already exists and get its SHA for update
  let fileSha = null;
  const checkResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filepath}`,
    {
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (checkResponse.ok) {
    const existingFile = await checkResponse.json();
    fileSha = existingFile.sha;
    console.log('[uploadZipToGithub] File exists, SHA:', fileSha);
  }

  // Upload ZIP file via Contents API
  const requestBody = {
    message: message,
    content: base64Content,
  };

  // Include SHA if file exists (for update)
  if (fileSha) {
    requestBody.sha = fileSha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filepath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload ZIP: ${error}`);
  }

  const result = await response.json();
  console.log('[uploadZipToGithub] Upload successful:', result.commit.sha);

  return result.commit.sha;
}

async function createInitialCommit(fileTree, message) {
  // For empty repos: use Contents API to create files directly
  console.log('[GitHub] Using Contents API to create files in empty repo');

  // Create a simple .gitkeep file first to initialize the repo with a commit
  const gitkeepResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/.gitkeep`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: message,
        content: encodeBase64(''),
      }),
    }
  );

  if (!gitkeepResponse.ok) {
    const error = await gitkeepResponse.text();
    throw new Error(`Failed to create initial commit: ${error}`);
  }

  // Now create all the blueprint files
  console.log('[GitHub] Creating', fileTree.length, 'files');
  for (const file of fileTree) {
    const fileResponse = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${file.path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Add ${file.path}`,
          content: encodeBase64(file.content),
        }),
      }
    );

    if (!fileResponse.ok) {
      const error = await fileResponse.text();
      console.error(`Failed to create ${file.path}:`, error);
      // Continue with other files even if one fails
    } else {
      console.log(`[GitHub] Created ${file.path}`);
    }
  }

  // Get the latest commit SHA to return
  const commitsResponse = await fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/commits`,
    {
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (commitsResponse.ok) {
    const commits = await commitsResponse.json();
    if (commits.length > 0) {
      return commits[0].sha;
    }
  }

  return 'unknown';
}

// Simple ZIP file parser (without external dependencies)
async function parseZipBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const view = new Uint8Array(arrayBuffer);

  const files = [];
  let offset = 0;

  // Find Central Directory
  let centralDirOffset = -1;
  for (let i = view.length - 22; i >= 0; i--) {
    if (
      view[i] === 0x50 &&
      view[i + 1] === 0x4b &&
      view[i + 2] === 0x05 &&
      view[i + 3] === 0x06
    ) {
      centralDirOffset = readDWord(view, i + 16);
      break;
    }
  }

  if (centralDirOffset === -1) {
    throw new Error('Invalid ZIP file: Central Directory not found');
  }

  offset = centralDirOffset;
  while (offset < view.length) {
    if (
      view[offset] === 0x50 &&
      view[offset + 1] === 0x4b &&
      view[offset + 2] === 0x01 &&
      view[offset + 3] === 0x02
    ) {
      const filenameLength = readWord(view, offset + 26);
      const extraLength = readWord(view, offset + 28);
      const commentLength = readWord(view, offset + 30);
      const uncompressedSize = readDWord(view, offset + 24);
      const localHeaderOffset = readDWord(view, offset + 42);

      const filename = new TextDecoder().decode(
        view.slice(offset + 46, offset + 46 + filenameLength)
      );

      if (!filename.endsWith('/')) {
        // Read file content from local header
        const localOffset = localHeaderOffset + 30 + filenameLength + readWord(view, localHeaderOffset + 26);
        const compressedSize = readDWord(view, localHeaderOffset + 18);
        const content = new TextDecoder().decode(
          view.slice(localOffset, localOffset + uncompressedSize)
        );

        files.push({
          path: filename,
          mode: '100644',
          type: 'blob',
          content: content,
        });
      }

      offset += 46 + filenameLength + extraLength + commentLength;
    } else {
      break;
    }
  }

  return files;
}

function readWord(view, offset) {
  return view[offset] | (view[offset + 1] << 8);
}

function readDWord(view, offset) {
  return (
    view[offset] |
    (view[offset + 1] << 8) |
    (view[offset + 2] << 16) |
    (view[offset + 3] << 24)
  );
}

async function deleteVersion(blueprintName, filename, fileSha) {
  try {
    // Ensure credentials are loaded
    await ensureCredentials();

    if (!fileSha) {
      throw new Error('Cannot delete: file SHA not available');
    }

    const filepath = `${blueprintName}/${filename}`;
    const commitMessage = `Delete blueprint version ${filename}`;

    console.log('[deleteVersion] Deleting', filepath);

    const response = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filepath}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: commitMessage,
          sha: fileSha,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete file: ${error}`);
    }

    console.log('[deleteVersion] Successfully deleted', filepath);
    return { success: true };
  } catch (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

async function getVersions(blueprintName) {
  try {
    // Ensure credentials are loaded
    await ensureCredentials();

    if (!blueprintName) {
      throw new Error('Blueprint name required to fetch versions.');
    }

    // Fetch commits that touched files in the blueprint folder (last 100 commits)
    // This ensures we get the file history
    const response = await fetch(
      `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/commits?path=${blueprintName}&per_page=100`,
      {
        headers: {
          Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    // 404 means the path doesn't exist yet
    if (response.status === 404 || response.status === 409) {
      return []; // Return empty list
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GitHub API error response:', errorBody);
      throw new Error(`GitHub API error (${response.status}): ${errorBody}`);
    }

    const commits = await response.json();

    // Extract file information from commits
    // Each commit touches at least one file in the blueprint folder
    const files = [];
    const seenFiles = new Set();

    for (const commit of commits) {
      // Get the commit details to see which files were touched
      const detailResponse = await fetch(
        `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/commits/${commit.sha}`,
        {
          headers: {
            Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (detailResponse.ok) {
        const detail = await detailResponse.json();

        // Extract ZIP files from this commit
        for (const file of detail.files) {
          if (file.filename.startsWith(`${blueprintName}/`) && file.filename.endsWith('.zip')) {
            const filename = file.filename.split('/').pop();

            if (!seenFiles.has(filename)) {
              seenFiles.add(filename);

              // Get the file SHA for deletion purposes
              const filePath = `${blueprintName}/${filename}`;
              let fileSha = null;

              const fileResponse = await fetch(
                `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filePath}`,
                {
                  headers: {
                    Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json',
                  },
                }
              );

              if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                fileSha = fileData.sha;
              }

              files.push({
                date: commit.commit.author.date,
                name: filename,
                hash: commit.sha.substring(0, 7),
                sha: fileSha,
              });
            }
          }
        }
      }

      // Stop after we have 10 files
      if (files.length >= 10) {
        break;
      }
    }

    // Sort by date descending (newest first)
    files.sort((a, b) => new Date(b.date) - new Date(a.date));

    return files.slice(0, 10);
  } catch (error) {
    throw new Error(`Failed to fetch versions: ${error.message}`);
  }
}

async function bulkDownload(blueprintNames) {
  try {
    // Ensure credentials are loaded before proceeding
    await ensureCredentials();

    if (!blueprintNames || blueprintNames.length === 0) {
      throw new Error('No blueprints specified for download.');
    }

    console.log('[bulkDownload] Preparing downloads for', blueprintNames.length, 'blueprints');

    const blueprintData = {};

    // Download versions for each blueprint
    for (const blueprintName of blueprintNames) {
      console.log('[bulkDownload] Processing blueprint:', blueprintName);

      // Get all versions for this blueprint
      const versions = await getVersions(blueprintName);
      console.log('[bulkDownload] Found', versions.length, 'versions for', blueprintName);

      blueprintData[blueprintName] = [];

      // Download each version ZIP
      for (const version of versions) {
        const filepath = `${blueprintName}/${version.name}`;

        console.log('[bulkDownload] Downloading:', filepath);

        const downloadResponse = await fetch(
          `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filepath}`,
          {
            headers: {
              Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3.raw',
            },
          }
        );

        if (!downloadResponse.ok) {
          const errorText = await downloadResponse.text();
          console.error('[bulkDownload] Failed to download', filepath, 'status:', downloadResponse.status, 'error:', errorText);
          continue;
        }

        try {
          const zipBlob = await downloadResponse.blob();

          if (zipBlob.size === 0) {
            console.error('[bulkDownload] Downloaded file is empty:', filepath);
            continue;
          }

          const arrayBuffer = await zipBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Convert to base64
          let base64 = '';
          for (let i = 0; i < uint8Array.length; i++) {
            base64 += String.fromCharCode(uint8Array[i]);
          }
          base64 = btoa(base64);

          blueprintData[blueprintName].push({
            filename: version.name,
            data: base64
          });

          console.log('[bulkDownload] Downloaded', version.name, 'size:', zipBlob.size);
        } catch (error) {
          console.error('[bulkDownload] Error processing file', filepath, ':', error);
          continue;
        }
      }
    }

    console.log('[bulkDownload] All files downloaded, returning to content script');

    return blueprintData;
  } catch (error) {
    throw new Error(`Bulk download failed: ${error.message}`);
  }
}

async function restoreVersion(blueprintName, filename) {
  try {
    console.log('[restoreVersion] Restoring version:', filename);

    // Ensure credentials are loaded
    await ensureCredentials();
    console.log('[restoreVersion] Credentials loaded. GitHub config:', {
      username: CONFIG.GITHUB_USERNAME,
      repo: CONFIG.REPO_NAME,
      token: CONFIG.GITHUB_TOKEN ? 'present' : 'missing'
    });

    // Download the ZIP from GitHub
    const filepath = `${blueprintName}/${filename}`;
    const githubUrl = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${filepath}`;
    console.log('[restoreVersion] Downloading from GitHub URL:', githubUrl);

    const downloadResponse = await fetch(githubUrl, {
      headers: {
        Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
      },
    });

    console.log('[restoreVersion] GitHub response status:', downloadResponse.status, downloadResponse.statusText);

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error('[restoreVersion] Failed to download from GitHub:', downloadResponse.status, errorText);
      throw new Error(`Failed to download version from GitHub: ${downloadResponse.status} - ${errorText}`);
    }

    const zipBlob = await downloadResponse.blob();
    console.log('[restoreVersion] Downloaded ZIP successfully, size:', zipBlob.size, 'bytes');

    // Get the Logik API key from storage
    const data = await new Promise((resolve) => {
      chrome.storage.local.get('profiles', (result) => {
        resolve(result);
      });
    });

    const profiles = data.profiles || [];
    if (profiles.length === 0) {
      throw new Error('No Logik API profiles configured. Please configure in extension settings.');
    }

    // For now, use the first profile (in the future, detect based on URL)
    const profile = profiles[0];
    const apiKey = profile.apiKey;
    const environment = profile.environment;
    console.log('[restoreVersion] Using environment:', environment);

    // Upload to Logik API
    const logikUrl = `https://${environment}.test.logik.io/a/admin/v2/uploadFile`;
    console.log('[restoreVersion] Uploading to Logik:', logikUrl);

    // Construct multipart/form-data manually (service workers don't have FormData)
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const zipArray = new Uint8Array(zipArrayBuffer);

    let body = '';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="jobType"\r\n\r\n';
    body += 'GENERIC_IMPORT\r\n';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
    body += 'Content-Type: application/zip\r\n\r\n';

    const bodyStart = new TextEncoder().encode(body);
    const bodyEnd = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);

    const finalBody = new Uint8Array(bodyStart.length + zipArray.length + bodyEnd.length);
    finalBody.set(bodyStart);
    finalBody.set(zipArray, bodyStart.length);
    finalBody.set(bodyEnd, bodyStart.length + zipArray.length);

    const uploadResponse = await fetch(logikUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      credentials: 'include',
      body: finalBody,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[restoreVersion] Failed to upload to Logik:', uploadResponse.status, errorText);
      throw new Error(`Failed to upload to Logik: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[restoreVersion] Upload response:', uploadResult);

    const jobId = uploadResult.id;
    if (!jobId) {
      throw new Error('No job ID returned from upload');
    }

    // Poll job status until complete
    const jobUrl = `https://${environment}.test.logik.io/api/admin/v1/job/${jobId}`;
    console.log('[restoreVersion] Polling job status:', jobUrl);

    let jobStatus = 'STARTED';
    let pollCount = 0;
    const maxPolls = 120; // Max 2 minutes (120 * 1 second)
    let finalJobData = null;

    while (jobStatus !== 'COMPLETED' && pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(jobUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('[restoreVersion] Failed to check job status:', statusResponse.status, errorText);
        throw new Error(`Failed to check job status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      jobStatus = statusData.status;
      finalJobData = statusData;
      console.log(`[restoreVersion] Job status (poll ${pollCount + 1}):`, jobStatus);
      console.log('[restoreVersion] Full job data:', JSON.stringify(statusData, null, 2));
      pollCount++;
    }

    if (jobStatus !== 'COMPLETED') {
      throw new Error(`Job did not complete within timeout. Final status: ${jobStatus}`);
    }

    console.log('[restoreVersion] Restore job completed successfully');
    console.log('[restoreVersion] Final job data:', JSON.stringify(finalJobData, null, 2));
    return { success: true, message: `Version ${filename} restored successfully` };
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}
