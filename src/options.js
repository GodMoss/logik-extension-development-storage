// State for profile editing
let editingProfileIndex = null;

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('addProfileBtn').addEventListener('click', toggleProfileForm);
document.getElementById('cancelProfileBtn').addEventListener('click', () => {
  resetProfileForm();
  toggleProfileForm();
});
document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
document.getElementById('saveGithubBtn').addEventListener('click', saveGithubSettings);
document.getElementById('clearBtn').addEventListener('click', clearSettings);

// Help modal functionality
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.add('open');
});

document.getElementById('closeHelpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.remove('open');
});

document.getElementById('helpModal').addEventListener('click', (e) => {
  if (e.target.id === 'helpModal') {
    document.getElementById('helpModal').classList.remove('open');
  }
});

async function loadSettings() {
  console.log('[Options] Loading saved settings...');

  const data = await chrome.storage.local.get([
    'profiles',
    'githubToken',
    'githubUsername',
    'githubRepo'
  ]);

  // Load GitHub settings
  if (data.githubToken) {
    document.getElementById('githubToken').value = data.githubToken;
  }

  if (data.githubUsername) {
    document.getElementById('githubUsername').value = data.githubUsername;
  }

  if (data.githubRepo) {
    document.getElementById('githubRepo').value = data.githubRepo;
  }

  // Load profiles
  const profiles = data.profiles || [];
  renderProfiles(profiles);

  // Setup event delegation for profile actions
  setupProfileEventListeners();

  console.log('[Options] Settings loaded');
}

function setupProfileEventListeners() {
  const profilesList = document.getElementById('profilesList');

  profilesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-edit')) {
      const index = parseInt(e.target.dataset.index);
      await editProfile(index);
    } else if (e.target.classList.contains('btn-delete')) {
      const index = parseInt(e.target.dataset.index);
      await deleteProfile(index);
    }
  });
}

function renderProfiles(profiles) {
  const profilesList = document.getElementById('profilesList');

  if (!profiles || profiles.length === 0) {
    profilesList.innerHTML = `
      <div class="empty-state">
        <p>No profiles yet. Click "Add New Profile" to get started.</p>
      </div>
    `;
    return;
  }

  profilesList.innerHTML = profiles
    .map(
      (profile, index) => `
    <div class="profile-card">
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(profile.name)}</div>
        <div class="profile-env">Environment: ${escapeHtml(profile.environment)}</div>
      </div>
      <div class="profile-actions">
        <button class="btn-edit" data-index="${index}">Edit</button>
        <button class="btn-delete" data-index="${index}">Delete</button>
      </div>
    </div>
  `
    )
    .join('');
}

function toggleProfileForm() {
  document.getElementById('profileForm').classList.toggle('open');
}

function resetProfileForm() {
  document.getElementById('profileName').value = '';
  document.getElementById('profileEnv').value = '';
  document.getElementById('profileApiKey').value = '';
  document.getElementById('profileFormStatus').classList.remove('success', 'error');
  document.getElementById('profileFormStatus').textContent = '';
  editingProfileIndex = null;
}

async function editProfile(index) {
  const data = await chrome.storage.local.get('profiles');
  const profiles = data.profiles || [];
  const profile = profiles[index];

  document.getElementById('profileName').value = profile.name;
  document.getElementById('profileEnv').value = profile.environment;
  document.getElementById('profileApiKey').value = profile.apiKey;
  editingProfileIndex = index;

  document.getElementById('profileForm').classList.add('open');
  document.getElementById('profileName').focus();
}

async function deleteProfile(index) {
  if (!confirm('Are you sure you want to delete this profile?')) return;

  const data = await chrome.storage.local.get('profiles');
  const profiles = data.profiles || [];

  profiles.splice(index, 1);
  await chrome.storage.local.set({ profiles });

  console.log('[Options] Profile deleted');
  renderProfiles(profiles);
}

async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  const environment = document.getElementById('profileEnv').value.trim();
  const apiKey = document.getElementById('profileApiKey').value.trim();

  // Validation
  if (!name) {
    showStatus('profileFormStatus', 'Client/Profile name is required', 'error');
    return;
  }

  if (!environment) {
    showStatus('profileFormStatus', 'Environment identifier is required', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('profileFormStatus', 'API Key is required', 'error');
    return;
  }

  const data = await chrome.storage.local.get('profiles');
  let profiles = data.profiles || [];

  if (editingProfileIndex !== null) {
    profiles[editingProfileIndex] = { name, environment, apiKey };
    console.log('[Options] Profile updated');
  } else {
    profiles.push({ name, environment, apiKey });
    console.log('[Options] Profile added');
  }

  await chrome.storage.local.set({ profiles });

  showStatus('profileFormStatus', '✓ Profile saved successfully', 'success');
  setTimeout(() => {
    resetProfileForm();
    toggleProfileForm();
    renderProfiles(profiles);
  }, 800);
}

async function saveGithubSettings() {
  const githubToken = document.getElementById('githubToken').value.trim();
  const githubUsername = document.getElementById('githubUsername').value.trim();
  const githubRepo = document.getElementById('githubRepo').value.trim();

  // Validation
  if (!githubToken || !githubUsername || !githubRepo) {
    showStatus('githubStatus', 'All GitHub fields are required', 'error');
    return;
  }

  await chrome.storage.local.set({
    githubToken,
    githubUsername,
    githubRepo
  });

  console.log('[Options] GitHub settings saved to storage');
  showStatus('githubStatus', '✓ GitHub settings saved', 'success');

  setTimeout(() => {
    document.getElementById('githubStatus').classList.remove('success', 'error');
  }, 3000);
}

async function clearSettings() {
  const confirmed = confirm('Are you sure? This will remove all saved profiles and GitHub credentials.');
  if (!confirmed) return;

  await chrome.storage.local.remove([
    'profiles',
    'githubToken',
    'githubUsername',
    'githubRepo'
  ]);

  document.getElementById('githubToken').value = '';
  document.getElementById('githubUsername').value = '';
  document.getElementById('githubRepo').value = '';

  console.log('[Options] All settings cleared');
  showStatus('githubStatus', '✓ All settings cleared', 'success');
  renderProfiles([]);
}

function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.remove('success', 'error');
  element.classList.add(type);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
