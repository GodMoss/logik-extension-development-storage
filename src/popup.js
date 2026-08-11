document.getElementById('pushButton').addEventListener('click', handlePushNewVersion);

async function handlePushNewVersion() {
  const button = document.getElementById('pushButton');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');

  button.disabled = true;
  statusEl.textContent = 'Exporting blueprint...';
  errorEl.textContent = '';

  try {
    // Send message to content script to export blueprint
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'exportBlueprint' });

    if (response.error) {
      throw new Error(response.error);
    }

    statusEl.textContent = 'Pushing to GitHub...';

    // Send the blueprint zip to service worker
    await chrome.runtime.sendMessage({
      action: 'pushVersion',
      blueprintZip: response.blueprintZip,
      blueprintName: response.blueprintName
    });

    statusEl.textContent = 'Version pushed successfully!';
    loadVersionHistory();

    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Push failed:', error);
    errorEl.textContent = `Error: ${error.message}`;
    statusEl.textContent = '';
  } finally {
    button.disabled = false;
  }
}

async function loadVersionHistory() {
  const listEl = document.getElementById('versionList');
  listEl.innerHTML = '<div class="loading">Loading versions...</div>';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getVersions' });

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.versions || response.versions.length === 0) {
      listEl.innerHTML = '<div class="loading">No versions yet</div>';
      return;
    }

    const html = response.versions
      .map(
        (v) => `
      <div class="version-item">
        <div class="version-date">${formatDate(v.date)}</div>
        <div class="version-hash">${v.hash.substring(0, 7)}</div>
      </div>
    `
      )
      .join('');

    listEl.innerHTML = html;
  } catch (error) {
    console.error('Failed to load versions:', error);
    listEl.innerHTML = `<div class="error">Failed to load versions: ${error.message}</div>`;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Load versions when popup opens
loadVersionHistory();
