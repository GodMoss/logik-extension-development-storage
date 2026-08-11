// Load saved settings when page opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when user clicks Save
document.getElementById('saveBtn').addEventListener('click', saveSettings);

// Clear all settings when user clicks Clear
document.getElementById('clearBtn').addEventListener('click', clearSettings);

// Help modal functionality
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.add('open');
});

document.getElementById('closeHelpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.remove('open');
});

// Close modal when clicking outside
document.getElementById('helpModal').addEventListener('click', (e) => {
  if (e.target.id === 'helpModal') {
    document.getElementById('helpModal').classList.remove('open');
  }
});

async function loadSettings() {
  console.log('[Options] Loading saved settings...');

  const data = await chrome.storage.local.get([
    'logikApiKey',
    'logikApiKeySandbox',
    'githubToken',
    'githubUsername',
    'githubRepo'
  ]);

  if (data.logikApiKey) {
    document.getElementById('logikApiKey').value = data.logikApiKey;
  }

  if (data.logikApiKeySandbox) {
    document.getElementById('logikApiKeySandbox').value = data.logikApiKeySandbox;
  }

  if (data.githubToken) {
    document.getElementById('githubToken').value = data.githubToken;
  }

  if (data.githubUsername) {
    document.getElementById('githubUsername').value = data.githubUsername;
  }

  if (data.githubRepo) {
    document.getElementById('githubRepo').value = data.githubRepo;
  }

  console.log('[Options] Settings loaded');
}

async function saveSettings() {
  const logikApiKey = document.getElementById('logikApiKey').value.trim();
  const logikApiKeySandbox = document.getElementById('logikApiKeySandbox').value.trim();
  const githubToken = document.getElementById('githubToken').value.trim();
  const githubUsername = document.getElementById('githubUsername').value.trim();
  const githubRepo = document.getElementById('githubRepo').value.trim();

  // Validation
  if (!logikApiKey && !logikApiKeySandbox) {
    showStatus('logikStatus', 'At least one Logik API Key is required', 'error');
    return;
  }

  if (!githubToken || !githubUsername || !githubRepo) {
    showStatus('githubStatus', 'All GitHub fields are required', 'error');
    return;
  }

  // Save to storage
  const toSave = {
    githubToken,
    githubUsername,
    githubRepo
  };

  if (logikApiKey) toSave.logikApiKey = logikApiKey;
  if (logikApiKeySandbox) toSave.logikApiKeySandbox = logikApiKeySandbox;

  await chrome.storage.local.set(toSave);

  console.log('[Options] Settings saved to storage');
  showStatus('logikStatus', '✓ Logik API Keys saved', 'success');
  showStatus('githubStatus', '✓ GitHub settings saved', 'success');

  // Clear status messages after 3 seconds
  setTimeout(() => {
    document.getElementById('logikStatus').classList.remove('success', 'error');
    document.getElementById('githubStatus').classList.remove('success', 'error');
  }, 3000);
}

async function clearSettings() {
  const confirmed = confirm('Are you sure? This will remove all saved credentials.');
  if (!confirmed) return;

  await chrome.storage.local.remove([
    'logikApiKey',
    'logikApiKeySandbox',
    'githubToken',
    'githubUsername',
    'githubRepo'
  ]);

  document.getElementById('logikApiKey').value = '';
  document.getElementById('logikApiKeySandbox').value = '';
  document.getElementById('githubToken').value = '';
  document.getElementById('githubUsername').value = '';
  document.getElementById('githubRepo').value = '';

  console.log('[Options] All settings cleared');
  showStatus('logikStatus', '✓ All settings cleared', 'success');
}

function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.add(type);
}
