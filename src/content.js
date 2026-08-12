// Inject side panel UI into the page when DOM is ready
console.log('[Content Script] Logik Blueprint VC loaded');

/**
 * THEME CONFIGURATION
 *
 * Defines color schemes for different page types. Each theme specifies:
 * - When it applies (page type detection function)
 * - Primary and accent colors for consistent styling
 * - Background and text colors
 *
 * To add a new theme:
 * 1. Add a new theme object below with unique id and colors
 * 2. Add a detection function (isOnXPage)
 * 3. The theme will automatically apply to matching pages
 */
const THEMES = {
  configurator: {
    id: 'configurator',
    name: 'Configurator (Blueprint)',
    description: 'Light cyan/blue with blue accents for blueprint configurator pages',
    detector: () => !isOnTransactionPage() && !isOnTablesPage() && !isOnBlueprintListPage(),
    colors: {
      primary: '#0369a1',
      primaryLight: '#0284c7',
      background: 'rgba(206, 250, 254, 0.85)',
      border: 'rgba(3, 105, 161, 0.3)',
      borderHover: 'rgba(3, 105, 161, 0.5)',
      text: '#0369a1',
      textLight: '#666',
      buttonBg: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
      buttonBgHover: 'linear-gradient(135deg, #0c4a6e 0%, #0c6ba6 100%)',
      tableRowBg: 'rgba(230, 248, 255, 0.7)',
      tableRowHover: 'rgba(206, 250, 254, 0.8)',
      headerBg: 'rgba(206, 250, 254, 0.8)',
      headerText: '#0284c7',
      modalBg: 'rgba(206, 250, 254, 0.95)',
      modalBorder: 'rgba(3, 105, 161, 0.3)',
      backdropFilter: 'blur(10px)'
    }
  },
  transaction: {
    id: 'transaction',
    name: 'Transaction (PQ Admin)',
    description: 'Mint with green accents for transaction and pricing quotation admin pages',
    detector: () => isOnTransactionPage(),
    colors: {
      primary: '#10b981',
      primaryLight: '#14b8a6',
      background: 'rgba(167, 243, 208, 0.85)',
      border: 'rgba(16, 185, 129, 0.4)',
      borderHover: 'rgba(16, 185, 129, 0.6)',
      text: '#10b981',
      textLight: '#999',
      buttonBg: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
      buttonBgHover: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
      tableRowBg: 'rgba(204, 250, 225, 0.7)',
      tableRowHover: 'rgba(167, 243, 208, 0.8)',
      headerBg: 'rgba(167, 243, 208, 0.8)',
      headerText: '#14b8a6',
      modalBg: 'rgba(204, 250, 225, 0.95)',
      modalBorder: 'rgba(16, 185, 129, 0.3)',
      backdropFilter: 'blur(10px)'
    }
  },
  tables: {
    id: 'tables',
    name: 'Tables (Data Admin)',
    description: 'Pink with red accents for table management and export pages',
    detector: () => isOnTablesPage(),
    colors: {
      primary: '#d63031',
      primaryLight: '#e84393',
      background: 'rgba(255, 240, 240, 0.85)',
      border: 'rgba(255, 107, 107, 0.5)',
      borderHover: 'rgba(255, 107, 107, 0.7)',
      text: '#d63031',
      textLight: '#999',
      buttonBg: 'linear-gradient(135deg, #d63031 0%, #e84393 100%)',
      buttonBgHover: 'linear-gradient(135deg, #c41e1e 0%, #d63384 100%)',
      tableRowBg: 'rgba(255, 245, 245, 0.7)',
      tableRowHover: 'rgba(254, 225, 225, 0.8)',
      headerBg: 'rgba(255, 240, 240, 1)',
      headerText: '#e84393',
      modalBg: 'rgba(255, 240, 240, 0.95)',
      modalBorder: 'rgba(214, 48, 49, 0.3)',
      backdropFilter: 'blur(10px)'
    }
  }
};

/**
 * Detects the current page theme and returns the theme configuration
 */
function getCurrentTheme() {
  for (const themeKey in THEMES) {
    const theme = THEMES[themeKey];
    if (theme.detector()) {
      return theme;
    }
  }
  return THEMES.configurator; // Default fallback
}

/**
 * Applies the appropriate theme class to the panel element
 */
function applyTheme(panelElement) {
  const theme = getCurrentTheme();

  // Remove all theme classes
  panelElement.classList.remove('logik-vc-configurator-theme', 'logik-vc-transaction-theme');

  // Apply the correct theme class
  const themeClass = `logik-vc-${theme.id}-theme`;
  panelElement.classList.add(themeClass);

  console.log('[Content Script] Applied theme:', theme.name);
}

function extractEnvironmentFromHostname() {
  const hostname = window.location.hostname;
  const match = hostname.match(/^([a-zA-Z0-9\-]+)\.test\.logik\.io$/);
  return match ? match[1] : null;
}

async function getLogikApiKeyForCurrentEnv() {
  const data = await chrome.storage.local.get('profiles');
  const profiles = data.profiles || [];
  const currentEnv = extractEnvironmentFromHostname();

  console.log('[Content Script] Current hostname environment:', currentEnv);

  if (!currentEnv) {
    throw new Error('Could not determine environment from hostname');
  }

  const matchingProfile = profiles.find(p => p.environment === currentEnv);
  if (!matchingProfile) {
    throw new Error(`No profile configured for environment: ${currentEnv}`);
  }

  console.log('[Content Script] Using profile:', matchingProfile.name);
  return matchingProfile.apiKey;
}

function isOnBlueprintListPage() {
  // Check if URL ends with /blueprints (but not /blueprint/{name})
  const path = window.location.pathname;
  return path.endsWith('/blueprints') && !path.includes('/blueprint/');
}

function isOnTransactionPage() {
  // Check if URL contains /transaction/ (PQ/transaction admin pages)
  const path = window.location.pathname;
  return path.includes('/transaction/');
}

function isOnTablesPage() {
  // Check if URL contains /io/tables or /tables (tables admin pages)
  const path = window.location.pathname;
  return path.includes('/io/tables') || path.includes('/tables');
}

let currentPageType = null;

if (document.body) {
  injectSidePanel();
} else {
  document.addEventListener('DOMContentLoaded', injectSidePanel);
}

// Track URL changes with polling (for SPA-style navigation)
let lastUrl = window.location.pathname;

// Listen for popstate events (back/forward buttons)
window.addEventListener('popstate', () => {
  console.log('[Content Script] popstate event - URL changed');
  checkAndUpdatePanel();
});

// Poll for URL changes (handles SPA navigation)
setInterval(() => {
  const currentUrl = window.location.pathname;
  if (currentUrl !== lastUrl) {
    console.log('[Content Script] URL changed from', lastUrl, 'to', currentUrl);
    lastUrl = currentUrl;
    checkAndUpdatePanel();
  }
}, 500); // Check every 500ms

function checkAndUpdatePanel() {
  const newPageType = isOnBlueprintListPage() ? 'blueprints' : 'versions';
  console.log('[Content Script] Current page type:', newPageType, 'Previous:', currentPageType);

  if (newPageType !== currentPageType) {
    console.log('[Content Script] Page type changed, updating panel...');
    updatePanelForCurrentPage();
  }
}

function updatePanelForCurrentPage() {
  const newPageType = isOnBlueprintListPage() ? 'blueprints' : 'versions';

  if (newPageType === currentPageType) {
    console.log('[Content Script] Page type unchanged, no update needed');
    return; // No change needed
  }

  console.log('[Content Script] Page type changed from', currentPageType, 'to', newPageType);
  console.log('[Content Script] Re-injecting panel with correct view...');

  // Save panel state before removing
  const oldPanel = document.getElementById('logik-blueprint-vc-panel');
  const wasOpen = oldPanel && oldPanel.classList.contains('open');
  console.log('[Content Script] Panel was', wasOpen ? 'open' : 'closed');

  const oldToggle = document.getElementById('logik-blueprint-vc-toggle');

  if (oldPanel) oldPanel.remove();
  if (oldToggle) oldToggle.remove();

  // Re-inject the panel with the correct view
  currentPageType = newPageType;

  // Create and inject new HTML
  const container = document.createElement('div');
  container.innerHTML = getPanelHTML();
  const newButton = container.firstElementChild;
  const newPanel = container.lastElementChild;
  document.body.appendChild(newButton); // Toggle button
  document.body.appendChild(newPanel); // Panel

  // Restore panel state (open or closed)
  if (wasOpen) {
    console.log('[Content Script] Restoring panel to open state');
    newPanel.classList.add('open');
  }

  // Apply theme based on current page
  applyTheme(newPanel);

  console.log('[Content Script] Panel re-injected with', newPageType, 'view');

  // Wire up listeners
  setupPanelListeners();

  // Load appropriate content
  if (newPageType === 'blueprints') {
    console.log('[Content Script] Loading blueprint list...');
    loadBlueprintList();
  } else {
    console.log('[Content Script] Loading version history...');
    loadVersionHistory();
  }
}

function injectSidePanel() {
  try {
    console.log('[Content Script] Injecting side panel...');

    // Create and inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles();
    document.head.appendChild(styleEl);
    console.log('[Content Script] Styles injected');

    // Create and inject HTML
    const container = document.createElement('div');
    container.innerHTML = getPanelHTML();
    const button = container.firstElementChild;
    let panel = container.lastElementChild;
    document.body.appendChild(button); // Toggle button
    document.body.appendChild(panel); // Panel

    console.log('[Content Script] Panel HTML injected');

    // Make sure panel starts closed (remove any 'open' class)
    panel = document.getElementById('logik-blueprint-vc-panel');
    if (panel) {
      panel.classList.remove('open', 'expanded');
      // Apply theme based on current page
      applyTheme(panel);
    }

    // Wire up event listeners
    setupPanelListeners();
    console.log('[Content Script] Panel listeners set up');

    // Initialize current page type and load appropriate content
    currentPageType = isOnBlueprintListPage() ? 'blueprints' : 'versions';
    console.log('[Content Script] Initial page type:', currentPageType);

    if (currentPageType === 'blueprints') {
      loadBlueprintList();
      console.log('[Content Script] Blueprint list loaded');
    } else {
      loadVersionHistory();
      console.log('[Content Script] Version history loaded');
    }
  } catch (error) {
    console.error('[Content Script] Error injecting side panel:', error);
  }
}

function getPanelHTML() {
  const isBlueprintListPage = isOnBlueprintListPage();
  const isTransactionPage = isOnTransactionPage();
  const iconUrl = chrome.runtime.getURL('src/icon.webp');

  if (isBlueprintListPage) {
    // Blueprint list page - show all blueprints
    return `
      <button id="logik-blueprint-vc-toggle" class="logik-vc-toggle" title="Blueprints" style="background-image: url('${iconUrl}')"></button>
      <div id="logik-blueprint-vc-panel" class="logik-vc-panel">
        <div class="logik-vc-header">
          <h2>Blueprints</h2>
          <button id="logik-vc-close" class="logik-vc-close">&times;</button>
        </div>
        <div class="logik-vc-content">
          <div class="logik-vc-section">
            <div id="logik-vc-blueprints" class="logik-vc-blueprints">
              <div class="logik-vc-loading">Loading blueprints...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Specific blueprint page - show version history and related tables
    return `
      <button id="logik-blueprint-vc-toggle" class="logik-vc-toggle" title="Admin Masterlord" style="background-image: url('${iconUrl}')"></button>
      <div id="logik-blueprint-vc-panel" class="logik-vc-panel">
        <button id="logik-vc-collapse-arrow" class="logik-vc-collapse-arrow" title="Expand/Collapse">◄</button>
        <div class="logik-vc-header">
          <h2>Admin Masterlord</h2>
          <button id="logik-vc-close" class="logik-vc-close">&times;</button>
        </div>

        <!-- Tab Navigation -->
        <div class="logik-vc-tabs" id="logik-vc-main-tabs">
          <button class="logik-vc-tab-btn ${isTransactionPage ? '' : 'logik-vc-tab-active'}" data-tab="version-control" ${isTransactionPage ? 'style="display: none;"' : ''}>Version Control</button>
          <button class="logik-vc-tab-btn ${isTransactionPage ? 'logik-vc-tab-active' : ''}" data-tab="rules">Rules</button>
          <button class="logik-vc-tab-btn" data-tab="tables" id="logik-vc-tables-tab-btn" style="display: none;">Tables</button>
        </div>

        <div class="logik-vc-content">
          <!-- Version Control Tab -->
          <div id="version-control-tab" class="logik-vc-tab-content ${isTransactionPage ? '' : 'logik-vc-tab-active'}">
            <div class="logik-vc-section">
              <button id="logik-vc-push" class="logik-vc-button">Push New Version</button>
              <div id="logik-vc-status" class="logik-vc-status"></div>
              <div id="logik-vc-error" class="logik-vc-error"></div>
            </div>

            <!-- Push filename modal -->
            <div id="logik-vc-modal" class="logik-vc-modal" style="display: none;">
              <div class="logik-vc-modal-backdrop"></div>
              <div class="logik-vc-modal-content">
                <h3>Push New Version</h3>
                <label for="logik-vc-filename">Filename:</label>
                <input type="text" id="logik-vc-filename" class="logik-vc-input" placeholder="e.g., my-version (or with .zip)"/>
                <div class="logik-vc-modal-buttons">
                  <button id="logik-vc-modal-cancel" class="logik-vc-modal-btn-cancel">Cancel</button>
                  <button id="logik-vc-modal-confirm" class="logik-vc-modal-btn-confirm">Push</button>
                </div>
              </div>
            </div>

            <div class="logik-vc-section">
              <div class="logik-vc-history-header">
                <h3>Version History</h3>
                <button id="logik-vc-refresh" class="logik-vc-refresh-btn" title="Refresh versions">↻</button>
              </div>
              <div id="logik-vc-versions" class="logik-vc-versions">
                <div class="logik-vc-loading">Loading versions...</div>
              </div>
            </div>
          </div>

          <!-- Rules Tab (with nested sub-tabs) -->
          <div id="rules-tab" class="logik-vc-tab-content ${isTransactionPage ? 'logik-vc-tab-active' : ''}">
            <!-- Nested tab navigation -->
            <div class="logik-vc-subtabs">
              <button class="logik-vc-subtab-btn logik-vc-subtab-active" data-subtab="related-tables">Related Tables</button>
              <button class="logik-vc-subtab-btn" data-subtab="advanced-search">Advanced Search</button>
            </div>

            <!-- Related Tables Sub-tab -->
            <div id="related-tables-subtab" class="logik-vc-subtab-content logik-vc-subtab-active">
              <div class="logik-vc-section">
                <button id="logik-vc-scan-tables" class="logik-vc-button">Scan For Tables</button>
                <div id="logik-vc-tables-status" class="logik-vc-status"></div>
                <div id="logik-vc-tables-error" class="logik-vc-error"></div>
              </div>
              <div class="logik-vc-section">
                <div id="logik-vc-tables" class="logik-vc-tables">
                  <div style="padding: 16px; color: #666; font-size: 12px;">Click "Scan For Tables" to detect managed tables referenced in this blueprint</div>
                </div>
              </div>
            </div>

            <!-- Advanced Search Sub-tab -->
            <div id="advanced-search-subtab" class="logik-vc-subtab-content">
              <!-- Status Messages -->
              <div class="logik-vc-section">
                <div id="logik-vc-rules-status" class="logik-vc-status"></div>
                <div id="logik-vc-rules-error" class="logik-vc-error"></div>
              </div>

              <!-- Filters -->
              <div class="logik-vc-section">
                <div class="logik-vc-filters">
                  <input
                    type="text"
                    id="logik-vc-search-input"
                    class="logik-vc-filter-input"
                    placeholder="Search Name, Variable Name, Description..."
                  >
                  <input
                    type="text"
                    id="logik-vc-target-field-input"
                    class="logik-vc-filter-input"
                    placeholder="Filter by Target Field..."
                  >
                  <input
                    type="text"
                    id="logik-vc-aggregate-field-input"
                    class="logik-vc-filter-input"
                    placeholder="Find Rules with Aggregate..."
                  >
                  <div class="logik-vc-filter-dropdown">
                    <button id="logik-vc-action-filter-btn" class="logik-vc-filter-btn">Action Type ▼</button>
                    <div id="logik-vc-action-filter-menu" class="logik-vc-filter-menu" style="display: none;">
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="determinationAction" class="logik-vc-action-checkbox">
                        ⚙️ Determination
                      </label>
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="exclusionAction" class="logik-vc-action-checkbox">
                        🚫 Exclusion
                      </label>
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="inclusionAction" class="logik-vc-action-checkbox">
                        ➕ Inclusion
                      </label>
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="messageAction" class="logik-vc-action-checkbox">
                        💬 Message
                      </label>
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="productAction" class="logik-vc-action-checkbox">
                        📦 Product
                      </label>
                      <label class="logik-vc-filter-option">
                        <input type="checkbox" value="visibilityAction" class="logik-vc-action-checkbox">
                        👁️ Hiding
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="logik-vc-section">
                <div class="logik-vc-rules-grid-container">
                  <table class="logik-vc-rules-grid">
                    <thead>
                      <tr>
                        <th class="logik-vc-grid-checkbox"><input type="checkbox" id="logik-vc-rules-select-all" title="Select all"><span class="logik-vc-resize-handle"></span></th>
                        <th class="logik-vc-grid-name">Name<span class="logik-vc-resize-handle"></span></th>
                        <th class="logik-vc-grid-variable">Variable Name<span class="logik-vc-resize-handle"></span></th>
                        <th class="logik-vc-grid-description">Description<span class="logik-vc-resize-handle"></span></th>
                        <th class="logik-vc-grid-actions">Action Types<span class="logik-vc-resize-handle"></span></th>
                        <th class="logik-vc-grid-modified">Last Modified<span class="logik-vc-resize-handle"></span></th>
                      </tr>
                    </thead>
                    <tbody id="logik-vc-rules-grid-body">
                      <!-- Rules will be populated here -->
                      <tr class="logik-vc-grid-placeholder">
                        <td colspan="6" style="padding: 32px; text-align: center; color: #999; font-size: 12px;">No rules to display</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Tables Tab -->
          <div id="tables-tab" class="logik-vc-tab-content" style="display: none;">
            <div class="logik-vc-section">
              <button id="logik-vc-download-tables-btn" class="logik-vc-button">Download Selected Tables</button>
              <div id="logik-vc-tables-list-status" class="logik-vc-status"></div>
              <div id="logik-vc-tables-list-error" class="logik-vc-error"></div>
            </div>
            <div class="logik-vc-section">
              <div id="logik-vc-selected-tables-list" class="logik-vc-tables-list">
                <div style="padding: 16px; color: #666; font-size: 12px;">No tables selected</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function getStyles() {
  return `
    .logik-vc-toggle {
      position: fixed;
      top: 50%;
      right: 30px;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 107, 107, 0.2);
      background-size: 100%;
      background-repeat: no-repeat;
      background-position: center;
      color: white;
      border: 2px solid rgba(255, 107, 107, 0.5);
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(255, 107, 107, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.3);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }
    .logik-vc-panel {
      position: fixed;
      right: -400px;
      top: 0;
      width: 400px;
      height: 100vh;
      background: rgba(255, 240, 240, 0.8);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255, 107, 107, 0.2);
      box-shadow: -8px 0 32px rgba(255, 107, 107, 0.15);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      transition: right 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: visible;
    }
    .logik-vc-panel.open { right: 0; }
    .logik-vc-panel.expanded {
      right: 0;
      width: 50vw;
    }
    .logik-vc-collapse-arrow {
      position: absolute;
      left: -42px;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 50px;
      background: rgba(255, 240, 240, 1);
      border: 2px solid rgba(255, 107, 107, 0.5);
      border-radius: 20px;
      color: #d63031;
      font-size: 20px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 9999;
      padding: 0;
    }
    .logik-vc-panel.open .logik-vc-collapse-arrow {
      display: flex;
    }
    .logik-vc-collapse-arrow:hover {
      background: rgba(255, 240, 240, 1);
      border-color: rgba(255, 107, 107, 0.7);
      color: #e84393;
    }
      font-size: 22px;
      font-weight: 700;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
      z-index: 9998;
    }
    }
    .logik-vc-header {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255, 107, 107, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 182, 193, 0.1) 100%);
      backdrop-filter: blur(10px);
    }
    .logik-vc-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      background: linear-gradient(135deg, #d63031 0%, #e84393 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.3px;
    }
    .logik-vc-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logik-vc-close:hover { color: #000; }
    .logik-vc-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .logik-vc-section { margin-bottom: 20px; }
    .logik-vc-section h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #222;
    }
    .logik-vc-history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .logik-vc-history-header h3 {
      margin: 0;
    }
    .logik-vc-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(255, 107, 107, 0.2);
      padding: 0 12px;
    }
    .logik-vc-tab-btn {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      color: rgba(102, 102, 102, 0.6);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .logik-vc-tab-btn:hover {
      color: #666;
    }
    .logik-vc-tab-btn.logik-vc-tab-active {
      color: #d63031;
      border-bottom-color: #d63031;
    }
    .logik-vc-tab-content {
      display: none;
    }
    .logik-vc-tab-content.logik-vc-tab-active {
      display: block;
    }
    .logik-vc-subtabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(255, 107, 107, 0.15);
      padding: 0 12px;
      background: rgba(255, 107, 107, 0.05);
    }
    .logik-vc-subtab-btn {
      flex: 1;
      padding: 10px 12px;
      border: none;
      background: transparent;
      color: rgba(102, 102, 102, 0.5);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .logik-vc-subtab-btn:hover {
      color: rgba(102, 102, 102, 0.8);
    }
    .logik-vc-subtab-btn.logik-vc-subtab-active {
      color: #e84393;
      border-bottom-color: #e84393;
    }
    .logik-vc-subtab-content {
      display: none;
    }
    .logik-vc-subtab-content.logik-vc-subtab-active {
      display: block;
    }
    .logik-vc-tables {
      padding: 12px;
      max-height: 500px;
      overflow-y: auto;
    }
    .logik-vc-tables .logik-vc-table-item {
      padding: 8px;
      margin: 4px 0;
      background: rgba(255, 107, 107, 0.05);
      border-left: 3px solid #d63031;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #333;
    }
    .logik-vc-refresh-btn {
      background: #f0f0f0;
      border: 1px solid #ddd;
      color: #333;
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .logik-vc-refresh-btn:hover {
      background: #e0e0e0;
      border-color: #999;
    }
    .logik-vc-refresh-btn.loading {
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .logik-vc-button {
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8fa3 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.2);
    }
    .logik-vc-button:hover {
      box-shadow: 0 6px 25px rgba(255, 107, 107, 0.35);
      transform: translateY(-2px);
    }
    .logik-vc-button:disabled {
      background: rgba(255, 107, 107, 0.3);
      cursor: not-allowed;
      box-shadow: none;
    }
    .logik-vc-status {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
      text-align: center;
    }
    .logik-vc-error {
      font-size: 12px;
      color: #d32f2f;
      padding: 8px;
      background: #ffebee;
      border-radius: 4px;
      margin-top: 8px;
    }
    .logik-vc-versions {
      border: 1px solid #eee;
      border-radius: 4px;
      max-height: 500px;
      overflow-y: auto;
    }
    .logik-vc-blueprints {
      border: 1px solid rgba(255, 107, 107, 0.2);
      border-radius: 12px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      background: rgba(255, 250, 250, 0.6);
      backdrop-filter: blur(10px);
      margin: 16px 12px 12px 12px;
      box-shadow: inset 0 0 20px rgba(255, 107, 107, 0.05);
    }
    .logik-vc-section {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .logik-vc-blueprint-item {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255, 107, 107, 0.1);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .logik-vc-blueprint-item:hover {
      background: rgba(255, 107, 107, 0.1);
      backdrop-filter: blur(10px);
    }
    .logik-vc-blueprint-item:last-child {
      border-bottom: none;
    }
    .logik-vc-blueprint-name {
      font-weight: 600;
      background: linear-gradient(135deg, #d63031 0%, #e84393 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .logik-vc-blueprint-desc {
      color: rgba(102, 102, 102, 0.8);
      font-size: 12px;
      line-height: 1.45;
      word-break: break-word;
      font-weight: 400;
    }
    .logik-vc-loading {
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
    .logik-vc-version-item {
      padding: 12px;
      border-bottom: 1px solid #eee;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .logik-vc-version-item:last-child { border-bottom: none; }
    .logik-vc-version-info {
      flex: 1;
      min-width: 0;
    }
    .logik-vc-version-date {
      font-weight: 500;
      color: #222;
      margin-bottom: 4px;
    }
    .logik-vc-version-name {
      color: #666;
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
    }
    .logik-vc-version-delete {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 4px;
      font-size: 16px;
      opacity: 0.6;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    .logik-vc-version-delete:hover {
      opacity: 1;
      color: #d32f2f;
    }
    .logik-vc-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .logik-vc-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
    }
    .logik-vc-modal-content {
      position: relative;
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    .logik-vc-modal-content h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #222;
    }
    .logik-vc-modal-content label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #444;
    }
    .logik-vc-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }
    .logik-vc-input:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
    }
    .logik-vc-modal-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .logik-vc-modal-btn-cancel,
    .logik-vc-modal-btn-confirm {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .logik-vc-modal-btn-cancel {
      background: #f0f0f0;
      color: #333;
    }
    .logik-vc-modal-btn-cancel:hover {
      background: #e0e0e0;
    }
    .logik-vc-modal-btn-confirm {
      background: #0052cc;
      color: white;
    }
    .logik-vc-modal-btn-confirm:hover {
      background: #003399;
    }
    .logik-vc-table-header {
      padding: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      transition: background 0.2s ease;
    }
    .logik-vc-table-header:hover {
      background: rgba(255, 107, 107, 0.1);
    }
    .logik-vc-table-toggle {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      color: #d63031;
      font-weight: 600;
      min-width: 12px;
    }
    .logik-vc-table-rules {
      padding-left: 24px;
      padding-bottom: 8px;
    }
    .logik-vc-rule-item {
      display: block;
      padding: 6px 8px;
      margin: 4px 0;
      background: rgba(232, 67, 147, 0.08);
      border-left: 2px solid #e84393;
      border-radius: 3px;
      font-size: 11px;
      color: #d63031;
      line-height: 1.4;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .logik-vc-rule-item:hover {
      background: rgba(232, 67, 147, 0.15);
      border-left-color: #d63031;
      color: #c91f1f;
    }
    .logik-vc-tables-list {
      padding: 12px;
      max-height: 500px;
      overflow-y: auto;
    }
    .logik-vc-tables-list .logik-vc-table-item {
      padding: 12px;
      margin: 6px 0;
      background: rgba(255, 107, 107, 0.08);
      border-left: 3px solid #d63031;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logik-vc-tables-list .logik-vc-table-item:hover {
      background: rgba(255, 107, 107, 0.12);
    }
    .logik-vc-table-remove-btn {
      background: none;
      border: none;
      color: #d63031;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.6;
      transition: opacity 0.2s;
      padding: 4px;
    }
    .logik-vc-table-remove-btn:hover {
      opacity: 1;
    }
    .logik-vc-rules-grid-container {
      padding: 12px;
      overflow-x: auto;
    }
    .logik-vc-rules-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: white;
      border: 1px solid rgba(255, 107, 107, 0.1);
      border-radius: 4px;
      overflow: visible;
      table-layout: fixed;
    }
    .logik-vc-rules-grid thead {
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.08) 0%, rgba(232, 67, 147, 0.08) 100%);
      border-bottom: 1px solid rgba(255, 107, 107, 0.2);
    }
    .logik-vc-rules-grid th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #d63031;
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .logik-vc-rules-grid td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(255, 107, 107, 0.08);
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .logik-vc-rules-grid tbody tr:hover {
      background: rgba(255, 107, 107, 0.05);
    }
    .logik-vc-grid-checkbox {
      width: 35px;
      text-align: center;
      flex-shrink: 0;
    }
    .logik-vc-grid-checkbox input[type="checkbox"] {
      cursor: pointer;
    }
    .logik-vc-grid-name {
      width: 15%;
      font-weight: 500;
      min-width: 100px;
    }
    .logik-vc-grid-variable {
      width: 18%;
      min-width: 120px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logik-vc-copy-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 6px;
      opacity: 1;
      transition: opacity 0.2s;
      flex-shrink: 0;
      margin-left: 4px;
    }
    .logik-vc-copy-btn:hover {
      opacity: 0.7;
    }
    .logik-vc-grid-description {
      width: 25%;
      color: #666;
      min-width: 120px;
    }
    .logik-vc-grid-actions {
      width: 12%;
      color: #666;
      min-width: 80px;
    }
    .logik-vc-grid-modified {
      width: 20%;
      color: #666;
      min-width: 120px;
    }
    .logik-vc-grid-placeholder {
      background: rgba(255, 107, 107, 0.02);
    }
    .logik-vc-filters {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .logik-vc-filter-input {
      flex: 1;
      min-width: 200px;
      padding: 8px 12px;
      border: 1px solid rgba(255, 107, 107, 0.2);
      border-radius: 4px;
      font-size: 12px;
      box-sizing: border-box;
    }
    .logik-vc-filter-input:focus {
      outline: none;
      border-color: #d63031;
      box-shadow: 0 0 0 2px rgba(214, 48, 49, 0.1);
    }
    .logik-vc-filter-dropdown {
      position: relative;
    }
    .logik-vc-filter-btn {
      padding: 8px 12px;
      background: white;
      border: 1px solid rgba(255, 107, 107, 0.2);
      border-radius: 4px;
      font-size: 12px;
      color: #333;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logik-vc-filter-btn:hover {
      border-color: #d63031;
      color: #d63031;
    }
    .logik-vc-filter-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid rgba(255, 107, 107, 0.2);
      border-radius: 4px;
      margin-top: 4px;
      min-width: 180px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 100;
    }
    .logik-vc-filter-option {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      font-size: 12px;
      color: #333;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 107, 107, 0.05);
      transition: background 0.2s;
    }
    .logik-vc-filter-option:hover {
      background: rgba(255, 107, 107, 0.05);
    }
    .logik-vc-filter-option:last-child {
      border-bottom: none;
    }
    .logik-vc-filter-option input[type="checkbox"] {
      margin-right: 8px;
      cursor: pointer;
    }

    /* Configurator Theme - Light Cyan/Blue Background with Blue Accents */
    .logik-vc-panel.logik-vc-configurator-theme {
      background: rgba(206, 250, 254, 0.85) !important;
      border-color: rgba(3, 105, 161, 0.3) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-close,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-collapse-arrow {
      color: #0284c7 !important;
      border-color: rgba(3, 105, 161, 0.3) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme h2 {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-tab-btn,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-subtab-btn {
      color: #666 !important;
      border-bottom-color: rgba(3, 105, 161, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-tab-btn.logik-vc-tab-active,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-subtab-btn.logik-vc-subtab-active {
      color: #0284c7 !important;
      border-bottom-color: #0284c7 !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme input,
    .logik-vc-panel.logik-vc-configurator-theme textarea {
      background: rgba(255, 255, 255, 0.9) !important;
      color: #333 !important;
      border-color: rgba(3, 105, 161, 0.3) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme input:focus,
    .logik-vc-panel.logik-vc-configurator-theme textarea:focus {
      border-color: #0284c7 !important;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme table thead th {
      color: #0284c7 !important;
      border-bottom-color: rgba(3, 105, 161, 0.3) !important;
      background: rgba(230, 248, 255, 0.5) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-button {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%) !important;
      color: #fff !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-button:hover {
      background: linear-gradient(135deg, #0c4a6e 0%, #0c6ba6 100%) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme table tbody tr {
      background: rgba(230, 248, 255, 0.7) !important;
      border-bottom-color: rgba(3, 105, 161, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme table tbody tr,
    .logik-vc-panel.logik-vc-configurator-theme table tbody td {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme table tbody tr:hover {
      background: rgba(206, 250, 254, 0.8) !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-grid-name,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-grid-variable,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-grid-description,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-grid-actions,
    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-grid-modified {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-configurator-theme .logik-vc-rules-category-header {
      background: rgba(206, 250, 254, 0.5) !important;
      border-bottom-color: rgba(3, 105, 161, 0.3) !important;
      color: #0284c7 !important;
    }

    /* Transaction Theme - Mint Background with Green Accents */
    .logik-vc-panel.logik-vc-transaction-theme {
      background: rgba(167, 243, 208, 0.85) !important;
      border-color: rgba(16, 185, 129, 0.4) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-close,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-collapse-arrow {
      color: #10b981 !important;
      border-color: rgba(16, 185, 129, 0.4) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme h2 {
      background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-tab-btn,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-subtab-btn {
      color: #333 !important;
      border-bottom-color: rgba(16, 185, 129, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-tab-btn.logik-vc-tab-active,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-subtab-btn.logik-vc-subtab-active {
      color: #10b981 !important;
      border-bottom-color: #10b981 !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme input,
    .logik-vc-panel.logik-vc-transaction-theme textarea {
      background: rgba(255, 255, 255, 0.9) !important;
      color: #333 !important;
      border-color: rgba(16, 185, 129, 0.3) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme input:focus,
    .logik-vc-panel.logik-vc-transaction-theme textarea:focus {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme table thead th {
      color: #10b981 !important;
      border-bottom-color: rgba(16, 185, 129, 0.3) !important;
      background: rgba(204, 250, 225, 0.4) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-button {
      background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%) !important;
      color: #fff !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-button:hover {
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme table tbody tr {
      background: rgba(204, 250, 225, 0.7) !important;
      border-bottom-color: rgba(16, 185, 129, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme table tbody tr,
    .logik-vc-panel.logik-vc-transaction-theme table tbody td {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme table tbody tr:hover {
      background: rgba(167, 243, 208, 0.8) !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-grid-name,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-grid-variable,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-grid-description,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-grid-actions,
    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-grid-modified {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-transaction-theme .logik-vc-rules-category-header {
      background: rgba(167, 243, 208, 0.4) !important;
      border-bottom-color: rgba(16, 185, 129, 0.3) !important;
      color: #10b981 !important;
    }

    /* Tables Theme - Pink Background with Red Accents */
    .logik-vc-panel.logik-vc-tables-theme {
      background: rgba(255, 240, 240, 0.85) !important;
      border-color: rgba(255, 107, 107, 0.5) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-close,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-collapse-arrow {
      color: #dc2626 !important;
      border-color: rgba(255, 107, 107, 0.5) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme h2 {
      background: linear-gradient(135deg, #d63031 0%, #e84393 100%) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-tab-btn,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-subtab-btn {
      color: #333 !important;
      border-bottom-color: rgba(214, 48, 49, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-tab-btn.logik-vc-tab-active,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-subtab-btn.logik-vc-subtab-active {
      color: #d63031 !important;
      border-bottom-color: #d63031 !important;
    }

    .logik-vc-panel.logik-vc-tables-theme input,
    .logik-vc-panel.logik-vc-tables-theme textarea {
      background: rgba(255, 255, 255, 0.9) !important;
      color: #333 !important;
      border-color: rgba(214, 48, 49, 0.3) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme input:focus,
    .logik-vc-panel.logik-vc-tables-theme textarea:focus {
      border-color: #d63031 !important;
      box-shadow: 0 0 0 3px rgba(214, 48, 49, 0.1) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme table thead th {
      color: #d63031 !important;
      border-bottom-color: rgba(214, 48, 49, 0.3) !important;
      background: rgba(255, 245, 245, 0.5) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-button {
      background: linear-gradient(135deg, #d63031 0%, #e84393 100%) !important;
      color: #fff !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-button:hover {
      background: linear-gradient(135deg, #c41e1e 0%, #d63384 100%) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme table tbody tr {
      background: rgba(255, 245, 245, 0.8) !important;
      border-bottom-color: rgba(214, 48, 49, 0.2) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme table tbody tr,
    .logik-vc-panel.logik-vc-tables-theme table tbody td {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-tables-theme table tbody tr:hover {
      background: rgba(254, 225, 225, 0.9) !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-grid-name,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-grid-variable,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-grid-description,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-grid-actions,
    .logik-vc-panel.logik-vc-tables-theme .logik-vc-grid-modified {
      color: #222 !important;
    }

    .logik-vc-panel.logik-vc-tables-theme .logik-vc-rules-category-header {
      background: rgba(255, 240, 240, 0.6) !important;
      border-bottom-color: rgba(214, 48, 49, 0.3) !important;
      color: #d63031 !important;
    }
  `;
}

function setupPanelListeners() {
  const panel = document.getElementById('logik-blueprint-vc-panel');
  const toggle = document.getElementById('logik-blueprint-vc-toggle');
  const closeBtn = document.getElementById('logik-vc-close');
  const pushBtn = document.getElementById('logik-vc-push');
  const refreshBtn = document.getElementById('logik-vc-refresh');

  if (!panel || !toggle) return;

  console.log('[Content Script] Setting up panel listeners');

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open', 'expanded');
    const collapseArrow = document.getElementById('logik-vc-collapse-arrow');
    if (collapseArrow) collapseArrow.textContent = '◄';
  });

  // Only attach these listeners if elements exist (on specific blueprint pages, not blueprint list)
  if (pushBtn) {
    pushBtn.addEventListener('click', handlePushNewVersion);
    console.log('[Content Script] Push button listener attached');
  }

  if (refreshBtn) {
    console.log('[Content Script] Attaching refresh button listener');
    refreshBtn.addEventListener('click', handleRefresh);
    console.log('[Content Script] Refresh button listener attached');
  }

  // Tab switching
  const tabBtns = panel.querySelectorAll('.logik-vc-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = btn.dataset.tab;

      // Remove active class from all tabs and buttons
      panel.querySelectorAll('.logik-vc-tab-btn').forEach(b => b.classList.remove('logik-vc-tab-active'));
      panel.querySelectorAll('.logik-vc-tab-content').forEach(t => t.classList.remove('logik-vc-tab-active'));

      // Add active class to clicked button and corresponding tab
      btn.classList.add('logik-vc-tab-active');
      const tabContent = panel.querySelector(`#${tabName}-tab`);
      if (tabContent) {
        tabContent.classList.add('logik-vc-tab-active');
      }
    });
  });

  // Subtab switching (for nested tabs within Rules)
  const subtabBtns = panel.querySelectorAll('.logik-vc-subtab-btn');
  subtabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subtabName = btn.dataset.subtab;
      const rulesTab = panel.querySelector('#rules-tab');

      if (!rulesTab) return;

      // Remove active class from all subtabs and buttons within rules tab
      rulesTab.querySelectorAll('.logik-vc-subtab-btn').forEach(b => b.classList.remove('logik-vc-subtab-active'));
      rulesTab.querySelectorAll('.logik-vc-subtab-content').forEach(t => t.classList.remove('logik-vc-subtab-active'));

      // Add active class to clicked button and corresponding subtab
      btn.classList.add('logik-vc-subtab-active');
      const subtabContent = rulesTab.querySelector(`#${subtabName}-subtab`);
      if (subtabContent) {
        subtabContent.classList.add('logik-vc-subtab-active');
      }

      // Auto-load rules on first visit to Advanced Search
      if (subtabName === 'advanced-search' && !window.logikAllRules) {
        console.log('[Content Script] First visit to Advanced Search, loading rules...');
        loadRules().catch(e => {
          console.error('[Content Script] Failed to load rules on Advanced Search open:', e);
        });
      }
    });
  });


  // Handle Tables tab visibility based on URL
  handleTablesTabVisibility();

  // Collapse arrow handler - available on all tabs
  const collapseArrow = panel.querySelector('#logik-vc-collapse-arrow');
  if (collapseArrow) {
    collapseArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = panel.classList.contains('expanded');

      if (isExpanded) {
        panel.classList.remove('expanded');
        collapseArrow.textContent = '◄';
      } else {
        panel.classList.add('expanded');
        collapseArrow.textContent = '►';
      }
    });
  }
}

function handleTablesTabVisibility() {
  const isOnTablesPage = window.location.pathname.includes('/tables');
  const tablesTabBtn = document.getElementById('logik-vc-tables-tab-btn');
  const versionControlBtn = document.querySelector('[data-tab="version-control"]');
  const rulesBtn = document.querySelector('[data-tab="rules"]');

  if (!tablesTabBtn || !versionControlBtn || !rulesBtn) {
    return; // Elements don't exist on this page
  }

  if (isOnTablesPage) {
    // Show only Tables tab
    tablesTabBtn.style.display = 'block';
    versionControlBtn.style.display = 'none';
    rulesBtn.style.display = 'none';

    // Switch to Tables tab
    document.querySelectorAll('.logik-vc-tab-btn').forEach(b => b.classList.remove('logik-vc-tab-active'));
    document.querySelectorAll('.logik-vc-tab-content').forEach(t => t.classList.remove('logik-vc-tab-active'));

    tablesTabBtn.classList.add('logik-vc-tab-active');
    const tablesContent = document.getElementById('tables-tab');
    if (tablesContent) {
      tablesContent.classList.add('logik-vc-tab-active');
      tablesContent.style.display = 'block';
    }

    // Start monitoring table selections
    startMonitoringTableSelections();
  } else {
    // Hide Tables tab and show other tabs
    tablesTabBtn.style.display = 'none';
    versionControlBtn.style.display = 'block';
    rulesBtn.style.display = 'block';
  }
}

function startMonitoringTableSelections() {
  console.log('[Content Script] Starting table selection monitoring...');

  // Store previous state to detect changes
  let previousCheckedState = new Set();
  let pollCount = 0;

  // Persistent set of selected table names (survives DOM scrolling)
  if (!window.selectedTablesSet) {
    window.selectedTablesSet = new Set();
  }

  // Poll for row selection changes every 500ms
  if (window.tablePollingInterval) {
    clearInterval(window.tablePollingInterval);
  }

  window.tablePollingInterval = setInterval(() => {
    pollCount++;

    // Find selected rows - try multiple detection methods
    const allRows = document.querySelectorAll('[role="row"]');
    let selectedRows = Array.from(allRows).filter(row => {
      // Skip header rows
      if (row.parentElement?.className?.includes('og-qg-head')) {
        return false;
      }

      // Method 1: Check for og-qg-selected class
      if (row.className?.includes('og-qg-selected')) {
        return true;
      }
      // Method 2: Look for checkbox-checked descendant
      if (row.querySelector('.checkbox-checked')) {
        return true;
      }
      // Method 3: aria-selected attribute
      if (row.getAttribute('aria-selected') === 'true') {
        return true;
      }
      // Method 4: data-selected attribute
      if (row.getAttribute('data-selected') === 'true') {
        return true;
      }
      // Method 5: Direct checkbox.checked property
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && checkbox.checked) {
        return true;
      }

      return false;
    });

    // Debug on every poll for now
    if (pollCount <= 5 || pollCount % 20 === 0) {
      console.log('[Content Script] Poll #' + pollCount + ': Found', allRows.length, 'rows,', selectedRows.length, 'selected');

      // Log details of first 3 rows and their parents/children
      if (pollCount === 1 || pollCount === 2) {
        for (let i = 0; i < Math.min(3, allRows.length); i++) {
          const row = allRows[i];
          const textContent = row.textContent.split('\n')[0].substring(0, 30);
          console.log('[Content Script] Poll #' + pollCount + ' Row', i, '- Text:', textContent);
          console.log('[Content Script]   Row className:', row.className);
          console.log('[Content Script]   Parent className:', row.parentElement?.className);

          // Check all children for og-qg-selected
          const childrenWithSelected = row.querySelectorAll('[class*="selected"]');
          if (childrenWithSelected.length > 0) {
            console.log('[Content Script]   Found children with "selected":', childrenWithSelected.length);
            childrenWithSelected.forEach(child => {
              console.log('[Content Script]     -', child.className);
            });
          }
        }
      }
    }

    // Build a set of currently visible selected table names
    const currentVisibleTables = new Set();
    selectedRows.forEach(row => {
      const tableLink = row.querySelector('a[href*="/table/"]');
      if (tableLink) {
        currentVisibleTables.add(tableLink.textContent.trim());
      }
    });

    // Update the persistent set: add newly visible tables and remove deselected ones
    // Add all currently visible selected tables
    currentVisibleTables.forEach(tableName => {
      window.selectedTablesSet.add(tableName);
    });

    // Remove tables that we can see are deselected (but keep ones that are just scrolled out of view)
    // We only remove if we can see the row and it's NOT selected
    const allVisibleTableNames = new Set();
    Array.from(allRows).forEach(row => {
      if (!row.parentElement?.className?.includes('og-qg-head')) {
        const tableLink = row.querySelector('a[href*="/table/"]');
        if (tableLink) {
          allVisibleTableNames.add(tableLink.textContent.trim());
        }
      }
    });

    // Remove from our persistent set only if we can see it and it's not selected
    for (const tableName of window.selectedTablesSet) {
      if (allVisibleTableNames.has(tableName) && !currentVisibleTables.has(tableName)) {
        // We can see this table and it's NOT selected, so remove it
        window.selectedTablesSet.delete(tableName);
      }
    }

    // Log every 10th poll to avoid spam
    if (pollCount % 10 === 0) {
      console.log('[Content Script] Poll #' + pollCount + ': Found', selectedRows.length, 'visible selected rows, tracking', window.selectedTablesSet.size, 'total');
    }

    // Check if the selection state changed
    const stateChanged =
      currentVisibleTables.size !== previousCheckedState.size ||
      Array.from(currentVisibleTables).some(name => !previousCheckedState.has(name)) ||
      Array.from(previousCheckedState).some(name => !currentVisibleTables.has(name));

    if (stateChanged) {
      console.log('[Content Script] Selection changed - updating list. Tracking', window.selectedTablesSet.size, 'tables');
      previousCheckedState = new Set(currentVisibleTables);
      updateSelectedTablesList();
    }
  }, 500);

  // Initial update
  updateSelectedTablesList();
  console.log('[Content Script] Table selection monitoring started (polling every 500ms)');
}

function updateSelectedTablesList() {
  const selectedTablesContainer = document.getElementById('logik-vc-selected-tables-list');
  if (!selectedTablesContainer) return;

  // Use the persistent set of selected tables (survives scrolling)
  if (!window.selectedTablesSet) {
    window.selectedTablesSet = new Set();
  }

  const selectedTables = Array.from(window.selectedTablesSet);

  console.log('[Content Script] Updating panel with', selectedTables.length, 'selected tables');

  // Update the UI
  if (selectedTables.length === 0) {
    selectedTablesContainer.innerHTML = '<div style="padding: 16px; color: #666; font-size: 12px;">No tables selected</div>';
  } else {
    selectedTablesContainer.innerHTML = selectedTables
      .map((table) => `
        <div class="logik-vc-table-item">
          <span>${table}</span>
        </div>
      `)
      .join('');
  }

}

async function downloadSelectedTables() {
  console.log('[Content Script] Starting download of selected tables');

  // Get table names from the extension panel (more reliable than querying the virtual list)
  const tableItems = document.querySelectorAll('.logik-vc-table-item');
  const tableNames = Array.from(tableItems).map(item => {
    return item.textContent.trim();
  }).filter(name => name.length > 0);

  if (tableNames.length === 0) {
    alert('No tables selected');
    return;
  }

  console.log('[Content Script] Downloading', tableNames.length, 'tables');
  const downloadBtn = document.getElementById('logik-vc-download-tables-btn');
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Downloading...';

  for (const tableName of tableNames) {
    console.log('[Content Script] Downloading table:', tableName);

    try {
      await downloadSingleTable(tableName);
    } catch (error) {
      console.error('[Content Script] Failed to download table:', tableName, error);
      alert(`Failed to download ${tableName}: ${error.message}`);
    }
  }

  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download Selected Tables';
  console.log('[Content Script] Download complete');
}

async function downloadSingleTable(tableName) {
  // Get credentials from storage (auto-detects environment)
  const apiKey = await getLogikApiKeyForCurrentEnv();

  // Extract tenant and sector from current URL
  const urlMatch = window.location.hostname.match(/^(.*?)\.(.*?)\.logik\.io$/);
  if (!urlMatch) {
    throw new Error('Could not determine tenant and sector from URL');
  }

  const tenant = urlMatch[1];
  const sector = urlMatch[2];
  const baseUrl = `https://${tenant}.${sector}.logik.io`;

  console.log('[Content Script] Exporting table:', tableName, 'from', baseUrl);

  // Step 1: POST to initiate export
  const exportResponse = await fetch(`${baseUrl}/api/managedTables/v3/managedTables/${tableName}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    credentials: 'include'
  });

  if (!exportResponse.ok) {
    throw new Error(`Export failed: ${exportResponse.status} ${exportResponse.statusText}`);
  }

  const exportData = await exportResponse.json();
  console.log('[Content Script] Export response:', JSON.stringify(exportData));

  // Try different possible response structures
  const jobId = exportData.jobId || exportData.job_id || exportData.id || exportData.data?.jobId;

  if (!jobId) {
    console.error('[Content Script] Response structure:', Object.keys(exportData));
    throw new Error('No jobId returned from export. Response: ' + JSON.stringify(exportData));
  }

  console.log('[Content Script] Export initiated, jobId:', jobId);

  // Step 2: Poll job status until complete
  await pollTableExportJob(jobId, baseUrl, apiKey);

  // Step 3: Download the zip file
  const fileResponse = await fetch(`${baseUrl}/api/managedTables/v2/job/${jobId}/file`, {
    headers: {
      'Accept': 'application/octet-stream',
      'Authorization': `Bearer ${apiKey}`
    },
    credentials: 'include'
  });

  if (!fileResponse.ok) {
    throw new Error(`File download failed: ${fileResponse.status}`);
  }

  const zipBlob = await fileResponse.blob();

  // Download the zip file directly
  const url = window.URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tableName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log('[Content Script] Downloaded zip:', tableName);
}

async function pollTableExportJob(jobId, baseUrl, apiKey, maxAttempts = 60) {
  const pollInterval = 500; // 500ms

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(`${baseUrl}/api/managedTables/v2/job/${jobId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      credentials: 'include'
    });

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    const jobData = await statusResponse.json();
    const status = jobData.status;

    console.log('[Content Script] Job', jobId, 'status:', status);

    if (status === 'COMPLETED') {
      return;
    }

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(`Export job failed with status: ${status}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Export job timeout - took longer than ' + (maxAttempts * pollInterval / 1000) + 'seconds');
}

function setupColumnResizing() {
  const table = document.querySelector('.logik-vc-rules-grid');
  if (!table) {
    console.log('[Content Script] Table not found for column resizing');
    return;
  }

  const headers = table.querySelectorAll('th');
  console.log('[Content Script] Setting up resizing for', headers.length, 'columns');

  headers.forEach((header, index) => {
    // Create resize handle if it doesn't exist
    let resizeHandle = header.querySelector('.logik-vc-resize-handle');
    if (!resizeHandle) {
      resizeHandle = document.createElement('div');
      resizeHandle.className = 'logik-vc-resize-handle';
      header.appendChild(resizeHandle);
    }

    resizeHandle.addEventListener('mousedown', function(e) {
      console.log('[Content Script] Starting resize of column', index);
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = header.offsetWidth;

      function onMouseMove(moveEvent) {
        const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
        header.style.width = newWidth + 'px';
        localStorage.setItem(`logik-vc-col-width-${index}`, newWidth);
      }

      function onMouseUp() {
        console.log('[Content Script] Finished resize of column', index);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  // Restore saved column widths
  headers.forEach((header, index) => {
    const savedWidth = localStorage.getItem(`logik-vc-col-width-${index}`);
    if (savedWidth) {
      header.style.width = savedWidth + 'px';
      console.log('[Content Script] Restored width for column', index, ':', savedWidth);
    }
  });
}

async function handleRefresh(e) {
  console.log('[Content Script] Refresh button clicked', e);
  e.stopPropagation();

  const refreshBtn = document.getElementById('logik-vc-refresh');
  console.log('[Content Script] refreshBtn element:', refreshBtn);

  if (!refreshBtn) {
    console.error('[Content Script] Refresh button not found during click handler');
    return;
  }

  console.log('[Content Script] Adding loading class');
  refreshBtn.classList.add('loading');

  try {
    console.log('[Content Script] Calling loadVersionHistoryWithRetry...');
    await loadVersionHistoryWithRetry();
    console.log('[Content Script] loadVersionHistory completed successfully');
  } catch (error) {
    console.error('[Content Script] Error during refresh:', error);
  } finally {
    console.log('[Content Script] Removing loading class');
    refreshBtn.classList.remove('loading');
  }
}

// Store the last version count to detect if list actually updated
let lastVersionCount = 0;

async function loadBlueprintList() {
  const listEl = document.getElementById('logik-vc-blueprints');
  if (!listEl) return;

  listEl.innerHTML = '<div class="logik-vc-loading">Loading blueprints...</div>';

  try {
    console.log('[Content Script] Fetching blueprint list...');

    // Get API key from storage (auto-detects environment)
    const apiKey = await getLogikApiKeyForCurrentEnv();

    // Extract tenant and sector from current URL
    const url = new URL(window.location.href);
    const parts = url.hostname.split('.');
    const tenant = parts[0];
    const sector = parts[1];

    const apiUrl = `https://${tenant}.${sector}.logik.io/api/admin/v2/blueprints?page=0&size=100&sort=modified%2CDESC`;

    console.log('[Content Script] Calling API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log('[Content Script] API response status:', response.status);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Content Script] Blueprint data:', data);

    // API returns blueprints in the 'content' array
    const blueprints = data.content || [];

    if (!blueprints || blueprints.length === 0) {
      listEl.innerHTML = '<div class="logik-vc-loading">No blueprints found</div>';
      return;
    }

    console.log('[Content Script] Rendering', blueprints.length, 'blueprints');

    // Add section header with download button and search
    const headerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px 12px; border-bottom: 1px solid rgba(255, 107, 107, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="logik-vc-select-all" style="
              cursor: pointer;
              width: 16px;
              height: 16px;
              accent-color: #d63031;
            " />
            <span style="font-size: 12px; color: rgba(102, 102, 102, 0.7); font-weight: 500;">Select blueprints to download</span>
          </div>
          <button id="logik-vc-download-selected" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #d63031 0%, #e84393 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.15);
            display: flex;
            align-items: center;
            gap: 6px;
          ">🗡️ Export</button>
        </div>
        <input type="text" id="logik-vc-filter-input" placeholder="Search blueprints..." style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 6px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.8);
          color: #333;
          transition: all 0.2s ease;
          box-sizing: border-box;
        " />
      </div>
    `;

    // Check which blueprints have versions in GitHub (in parallel)
    console.log('[Content Script] Checking for versions in GitHub (parallel)...');
    const blueprintsWithVersions = new Set();

    const versionChecks = blueprints.map(bp =>
      chrome.runtime.sendMessage({
        action: 'getVersions',
        blueprintName: bp.variableName,
      })
        .then(result => {
          if (result && result.versions && result.versions.length > 0) {
            blueprintsWithVersions.add(bp.variableName);
            console.log('[Content Script] Blueprint has versions:', bp.variableName);
          }
        })
        .catch(error => {
          console.log('[Content Script] Error checking versions for', bp.variableName, ':', error.message);
        })
    );

    await Promise.all(versionChecks);

    const blueprintHTML = blueprints
      .map((bp) => {
        const hasVersions = blueprintsWithVersions.has(bp.variableName);
        const checkboxHTML = hasVersions ? `
          <input type="checkbox" class="logik-vc-blueprint-checkbox" data-blueprint-name="${bp.variableName}" style="
            margin-top: 2px;
            cursor: pointer;
            width: 16px;
            height: 16px;
            accent-color: #d63031;
            flex-shrink: 0;
          " />
        ` : `<div style="width: 16px; flex-shrink: 0;"></div>`;

        return `
          <div class="logik-vc-blueprint-item" data-variable-name="${bp.variableName}" data-id="${bp.id}">
            ${checkboxHTML}
            <div style="flex: 1;">
              <div class="logik-vc-blueprint-name">${bp.name}</div>
              <div class="logik-vc-blueprint-desc">${bp.description || '(no description)'}</div>
            </div>
          </div>
        `;
      })
      .join('');

    listEl.innerHTML = headerHTML + blueprintHTML;

    // Wire up download button
    const downloadBtn = document.getElementById('logik-vc-download-selected');
    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.5';
    downloadBtn.addEventListener('click', handleBulkDownload);

    // Wire up "Select all" checkbox
    const selectAllCheckbox = document.getElementById('logik-vc-select-all');
    const itemCheckboxes = document.querySelectorAll('.logik-vc-blueprint-checkbox');

    const updateDownloadButtonState = () => {
      const anyChecked = Array.from(itemCheckboxes).some(cb => cb.checked);
      downloadBtn.disabled = !anyChecked;
      downloadBtn.style.opacity = anyChecked ? '1' : '0.5';
      downloadBtn.style.cursor = anyChecked ? 'pointer' : 'not-allowed';
    };

    selectAllCheckbox.addEventListener('change', () => {
      itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
      updateDownloadButtonState();
    });

    // Update "Select all" state and download button when individual checkboxes change
    itemCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const allChecked = Array.from(itemCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(itemCheckboxes).some(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
        updateDownloadButtonState();
      });
    });

    // Wire up search/filter input
    const filterInput = document.getElementById('logik-vc-filter-input');
    filterInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const blueprintItems = listEl.querySelectorAll('.logik-vc-blueprint-item');

      blueprintItems.forEach(item => {
        const name = item.querySelector('.logik-vc-blueprint-name')?.textContent.toLowerCase() || '';
        const desc = item.querySelector('.logik-vc-blueprint-desc')?.textContent.toLowerCase() || '';
        const matches = name.includes(searchTerm) || desc.includes(searchTerm);

        item.style.display = matches ? '' : 'none';
      });
    });

    console.log('[Content Script] Blueprint list updated');
  } catch (error) {
    console.error('Failed to load blueprints:', error);
    listEl.innerHTML = `<div style="padding:16px;color:#d32f2f;font-size:12px;">Error: ${error.message}</div>`;
  }
}

async function loadVersionHistoryWithRetry(attempt = 1) {
  const maxAttempts = 3;
  const listEl = document.getElementById('logik-vc-versions');
  if (!listEl) return;

  listEl.innerHTML = '<div class="logik-vc-loading">Loading versions...</div>';

  try {
    const blueprintName = extractBlueprintNameFromUI();
    console.log('[Content Script] loadVersionHistory: fetching versions for', blueprintName);

    const response = await chrome.runtime.sendMessage({
      action: 'getVersions',
      blueprintName: blueprintName,
    });

    console.log('[Content Script] loadVersionHistory: got response', response);

    if (!response) {
      throw new Error('No response from service worker');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.versions || response.versions.length === 0) {
      console.log('[Content Script] No versions found');
      lastVersionCount = 0;
      listEl.innerHTML = '<div class="logik-vc-loading">No versions yet</div>';
      return;
    }

    console.log('[Content Script] Rendering', response.versions.length, 'versions');
    const html = response.versions
      .map((v) => `
        <div class="logik-vc-version-item">
          <div class="logik-vc-version-info">
            <div class="logik-vc-version-date">${formatDate(v.date)}</div>
            <div class="logik-vc-version-name">${v.name}</div>
          </div>
          <button class="logik-vc-version-delete" data-filename="${v.name}" data-sha="${v.sha}" title="Delete version">⚰️</button>
        </div>
      `)
      .join('');

    listEl.innerHTML = html;
    lastVersionCount = response.versions.length;

    // Wire up delete buttons
    listEl.querySelectorAll('.logik-vc-version-delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteVersion);
    });

    console.log('[Content Script] Version list updated');
  } catch (error) {
    console.error('Failed to load versions:', error);
    console.error('Error details:', { message: error.message, stack: error.stack, attempt });

    // Retry if this is the first attempt and it looks like a timing issue
    if (attempt < maxAttempts && (error.message.includes('context invalidated') || error.message.includes('No response'))) {
      console.log('[Content Script] Retrying after delay (attempt', attempt + 1, 'of', maxAttempts, ')');
      await new Promise(resolve => setTimeout(resolve, 500));
      return loadVersionHistoryWithRetry(attempt + 1);
    }

    listEl.innerHTML = `<div style="padding:16px;color:#d32f2f;font-size:12px;">Error: ${error.message}</div>`;
  }
}

function handlePushNewVersion() {
  // Show the filename modal
  const modal = document.getElementById('logik-vc-modal');
  const filenameInput = document.getElementById('logik-vc-filename');
  const confirmBtn = document.getElementById('logik-vc-modal-confirm');
  const cancelBtn = document.getElementById('logik-vc-modal-cancel');
  const backdrop = document.querySelector('.logik-vc-modal-backdrop');

  // Set default filename with current timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
  const blueprintName = extractBlueprintNameFromUI();
  const defaultFilename = `blueprint-${timestamp}.zip`;
  filenameInput.value = defaultFilename;

  modal.style.display = 'flex';
  filenameInput.focus();
  filenameInput.select();

  // Set up one-time listeners for this modal instance
  const handleConfirm = async () => {
    console.log('[Content Script] Confirm clicked, input value:', filenameInput.value);
    const filename = await validateAndFixFilename(filenameInput.value);
    console.log('[Content Script] After validation, filename:', filename);
    if (filename) {
      console.log('[Content Script] Calling performPush with:', filename);
      performPush(filename);
    } else {
      console.log('[Content Script] Validation failed, not calling performPush');
    }
    closeModal();
  };

  const handleCancel = () => {
    console.log('[Content Script] Modal cancelled');
    closeModal();
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdrop) {
      handleCancel();
    }
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  const closeModal = () => {
    modal.style.display = 'none';
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    backdrop.removeEventListener('click', handleBackdropClick);
    filenameInput.removeEventListener('keypress', handleEnter);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  backdrop.addEventListener('click', handleBackdropClick);
  filenameInput.addEventListener('keypress', handleEnter);
}

async function validateAndFixFilename(filename) {
  console.log('[Content Script] validateAndFixFilename called with:', filename, 'type:', typeof filename);

  if (!filename || filename.trim() === '') {
    console.log('[Content Script] Filename is empty!');
    await showThemedAlert('Please enter a filename', 'Filename Required');
    return null;
  }

  filename = filename.trim();
  console.log('[Content Script] After trim:', filename);

  // Ensure .zip extension
  if (!filename.toLowerCase().endsWith('.zip')) {
    filename += '.zip';
  }

  console.log('[Content Script] Final filename to return:', filename);
  return filename;
}

async function performPush(customFilename) {
  console.log('[Content Script] performPush called with customFilename:', customFilename);

  const pushBtn = document.getElementById('logik-vc-push');
  const statusEl = document.getElementById('logik-vc-status');
  const errorEl = document.getElementById('logik-vc-error');

  pushBtn.disabled = true;
  statusEl.textContent = 'Exporting blueprint...';
  errorEl.textContent = '';

  try {
    const response = await exportBlueprint();

    statusEl.textContent = 'Pushing to GitHub...';

    const blueprintName = extractBlueprintNameFromUI();
    console.log('[Content Script] About to send message with:', {
      action: 'pushVersion',
      blueprintName: blueprintName,
      customFilename: customFilename,
      zipSize: response.data.length
    });

    const pushResponse = await chrome.runtime.sendMessage({
      action: 'pushVersion',
      blueprintZip: response,
      blueprintName: blueprintName,
      customFilename: customFilename,
    });

    console.log('[Content Script] Push response received:', pushResponse);

    if (pushResponse && pushResponse.error) {
      throw new Error(pushResponse.error);
    }

    statusEl.textContent = 'Version pushed successfully!';

    // Wait for GitHub to index the new file before refreshing (API can take a few seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));
    loadVersionHistory();

    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Push failed:', error);
    errorEl.textContent = `Error: ${error.message}`;
    statusEl.textContent = '';
  } finally {
    pushBtn.disabled = false;
  }
}

async function loadVersionHistory() {
  const listEl = document.getElementById('logik-vc-versions');
  if (!listEl) return;

  listEl.innerHTML = '<div class="logik-vc-loading">Loading versions...</div>';

  try {
    const blueprintName = extractBlueprintNameFromUI();
    console.log('[Content Script] loadVersionHistory: fetching versions for', blueprintName);

    const response = await chrome.runtime.sendMessage({
      action: 'getVersions',
      blueprintName: blueprintName,
    });

    console.log('[Content Script] loadVersionHistory: got response', response);

    if (!response) {
      throw new Error('No response from service worker');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.versions || response.versions.length === 0) {
      console.log('[Content Script] No versions found');
      listEl.innerHTML = '<div class="logik-vc-loading">No versions yet</div>';
      return;
    }

    console.log('[Content Script] Rendering', response.versions.length, 'versions');
    const html = response.versions
      .map((v) => `
        <div class="logik-vc-version-item">
          <div class="logik-vc-version-info">
            <div class="logik-vc-version-date">${formatDate(v.date)}</div>
            <div class="logik-vc-version-name">${v.name}</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="logik-vc-version-restore" data-filename="${v.name}" data-sha="${v.sha}" title="Restore version">🧟</button>
            <button class="logik-vc-version-delete" data-filename="${v.name}" data-sha="${v.sha}" title="Delete version">⚰️</button>
          </div>
        </div>
      `)
      .join('');

    listEl.innerHTML = html;

    // Wire up restore buttons
    listEl.querySelectorAll('.logik-vc-version-restore').forEach(btn => {
      btn.addEventListener('click', handleRestoreVersion);
    });

    // Wire up delete buttons
    listEl.querySelectorAll('.logik-vc-version-delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteVersion);
    });

    console.log('[Content Script] Version list updated');
  } catch (error) {
    console.error('Failed to load versions:', error);
    listEl.innerHTML = `<div style="padding:16px;color:#d32f2f;font-size:12px;">Error: ${error.message}</div>`;
  }
}

function showRestoreSuccess(filename) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // Create modal content
  const content = document.createElement('div');

  // Use black with red accents
  const bgColor = 'rgba(20, 20, 20, 0.95)';
  const primaryColor = '#d32f2f';
  const primaryLight = '#ff5252';
  const textColor = '#ffffff';
  const borderColor = 'rgba(211, 47, 47, 0.3)';

  content.style.cssText = `
    background: ${bgColor};
    backdrop-filter: blur(20px);
    border: 2px solid ${borderColor};
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(211, 47, 47, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative;
  `;

  // Create dancing skeleton animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes skeletonDance {
      0% {
        transform: translateY(0) rotate(-5deg);
      }
      25% {
        transform: translateY(-10px) rotate(5deg);
      }
      50% {
        transform: translateY(0) rotate(-5deg);
      }
      75% {
        transform: translateY(-10px) rotate(5deg);
      }
      100% {
        transform: translateY(0) rotate(-5deg);
      }
    }

    .dancing-skeleton {
      display: inline-block;
      font-size: 64px;
      animation: skeletonDance 0.8s ease-in-out infinite;
    }

    .gravestone {
      display: inline-block;
      font-size: 32px;
    }
  `;
  document.head.appendChild(style);

  content.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <span class="gravestone">⚰️</span>
      <h2 style="
        margin: 0 0 0 12px;
        font-size: 20px;
        font-weight: 700;
        color: ${primaryColor};
      ">Resurrection Protocol</h2>
    </div>

    <div style="
      text-align: center;
      margin: 24px 0;
      line-height: 1;
    ">
      <span class="dancing-skeleton">💀</span>
    </div>

    <p style="
      margin: 0 0 24px 0;
      font-size: 14px;
      color: #cccccc;
      line-height: 1.6;
      text-align: center;
    ">Version <strong style="color: ${primaryColor};">${filename}</strong> has risen from the dead!</p>

    <button id="restore-close" style="
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    ">Welcome Back</button>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Close on button click
  const closeBtn = content.querySelector('#restore-close');
  closeBtn.addEventListener('click', () => {
    modal.remove();
    style.remove();
  });

  // Also close when clicking outside the modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      style.remove();
    }
  });
}

function showDeleteConfirmation(filename) {
  return new Promise((resolve) => {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal content
    const content = document.createElement('div');

    // Get current theme for colors
    const theme = getCurrentTheme();
    const primaryColor = theme.colors.primary;
    const primaryLight = theme.colors.primaryLight;
    const bgColor = theme.colors.background;
    const borderColor = theme.colors.border;

    content.style.cssText = `
      background: ${bgColor};
      backdrop-filter: blur(20px);
      border: 2px solid ${borderColor};
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    content.innerHTML = `
      <h2 style="
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 700;
        color: ${primaryColor};
      ">⚔️ Seppuku Protocol</h2>

      <p style="
        margin: 0 0 24px 0;
        font-size: 14px;
        color: rgba(102, 102, 102, 0.9);
        line-height: 1.6;
      ">You are about to commit Seppuku. Do you wish to give <strong style="color: ${primaryColor};">${filename}</strong> an honorable death?</p>

      <div style="display: flex; gap: 12px;">
        <button id="seppuku-cancel" style="
          flex: 1;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.8);
          color: ${primaryColor};
          border: 2px solid ${primaryColor};
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        ">Cancel</button>

        <button id="seppuku-confirm" style="
          flex: 1;
          padding: 10px 16px;
          background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        ">Honorable Death</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Handle clicks
    const confirmBtn = content.querySelector('#seppuku-confirm');
    const cancelBtn = content.querySelector('#seppuku-cancel');

    const cleanup = () => {
      modal.remove();
    };

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Click backdrop to cancel
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });

    // Escape key to cancel
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        cleanup();
        resolve(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Hover effects
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.transform = 'translateY(-2px)';
      confirmBtn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.35)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.transform = 'translateY(0)';
      confirmBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.2)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'rgba(255, 107, 107, 0.2)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'rgba(255, 107, 107, 0.1)';
    });
  });
}

function showThemedAlert(message, title = 'Alert') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 240, 240, 0.95) 0%, rgba(255, 245, 240, 0.95) 100%);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(255, 107, 107, 0.3);
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(255, 107, 107, 0.25);
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <h3 style="
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, #d63031 0%, #e84393 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">${title}</h3>
        <p style="
          margin: 0;
          font-size: 14px;
          color: #333;
          line-height: 1.5;
        ">${message}</p>
      </div>
      <button id="alert-ok" style="
        padding: 10px 20px;
        background: linear-gradient(135deg, #d63031 0%, #e84393 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.2);
      ">OK</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const okBtn = content.querySelector('#alert-ok');
    const cleanup = () => {
      modal.remove();
      resolve();
    };

    okBtn.addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cleanup();
    });

    // Escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        cleanup();
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Hover effects
    okBtn.addEventListener('mouseenter', () => {
      okBtn.style.transform = 'translateY(-2px)';
      okBtn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.35)';
    });
    okBtn.addEventListener('mouseleave', () => {
      okBtn.style.transform = 'translateY(0)';
      okBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.2)';
    });
  });
}

async function handleRestoreVersion(e) {
  e.stopPropagation();

  const button = e.target.closest('.logik-vc-version-restore');
  const filename = button.dataset.filename;
  const blueprintName = extractBlueprintNameFromUI();

  console.log('[Content Script] Restore requested for:', filename);

  try {
    button.disabled = true;
    button.style.opacity = '0.3';

    console.log('[Content Script] Sending restore request...');
    const response = await chrome.runtime.sendMessage({
      action: 'restoreVersion',
      blueprintName: blueprintName,
      filename: filename,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    console.log('[Content Script] Restore successful!');
    showRestoreSuccess(filename);
  } catch (error) {
    console.error('[Content Script] Restore failed:', error);
    alert(`Failed to restore version: ${error.message}`);
  } finally {
    button.disabled = false;
    button.style.opacity = '1';
  }
}

async function handleDeleteVersion(e) {
  e.stopPropagation();

  const button = e.target.closest('.logik-vc-version-delete');
  const filename = button.dataset.filename;
  const sha = button.dataset.sha;
  const blueprintName = extractBlueprintNameFromUI();

  console.log('[Content Script] Delete requested for:', filename);

  // Show custom dramatic confirmation
  const confirmed = await showDeleteConfirmation(filename);
  if (!confirmed) {
    console.log('[Content Script] Delete cancelled by user');
    return;
  }

  try {
    button.disabled = true;
    button.style.opacity = '0.3';

    console.log('[Content Script] Sending delete request...');
    const response = await chrome.runtime.sendMessage({
      action: 'deleteVersion',
      blueprintName: blueprintName,
      filename: filename,
      sha: sha,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    console.log('[Content Script] Delete successful, refreshing...');
    await loadVersionHistoryWithRetry();
  } catch (error) {
    console.error('[Content Script] Delete failed:', error);
    await showThemedAlert(`${error.message}`, 'Delete Failed');
  } finally {
    button.disabled = false;
    button.style.opacity = '';
  }
}

function createSimpleZip(files) {
  const localFileHeaders = [];
  const centralDirHeaders = [];
  let offset = 0;

  // Create local file headers and collect data
  for (const file of files) {
    const filename = file.path;
    const filenameBytes = new TextEncoder().encode(filename);
    const filedata = file.data;

    // Local file header
    const lfhSize = 30 + filenameBytes.length;
    const lfh = new Uint8Array(lfhSize);
    const lfhView = new DataView(lfh.buffer);

    // Local file header signature
    lfhView.setUint32(0, 0x04034b50, true);
    // Version needed
    lfhView.setUint16(4, 20, true);
    // Flags
    lfhView.setUint16(6, 0, true);
    // Compression method (0 = stored/uncompressed)
    lfhView.setUint16(8, 0, true);
    // File modification time
    lfhView.setUint16(10, 0, true);
    // File modification date
    lfhView.setUint16(12, 0, true);
    // CRC-32 (not calculated for simplicity)
    lfhView.setUint32(14, 0, true);
    // Compressed size
    lfhView.setUint32(18, filedata.length, true);
    // Uncompressed size
    lfhView.setUint32(22, filedata.length, true);
    // Filename length
    lfhView.setUint16(26, filenameBytes.length, true);
    // Extra field length
    lfhView.setUint16(28, 0, true);

    // Copy filename
    for (let i = 0; i < filenameBytes.length; i++) {
      lfh[30 + i] = filenameBytes[i];
    }

    localFileHeaders.push({ header: lfh, data: filedata, offset, filename: filenameBytes });
    offset += lfhSize + filedata.length;
  }

  // Create central directory headers
  let centralDirSize = 0;
  for (const file of localFileHeaders) {
    const cdhSize = 46 + file.filename.length;
    const cdh = new Uint8Array(cdhSize);
    const cdhView = new DataView(cdh.buffer);

    // Central dir header signature
    cdhView.setUint32(0, 0x02014b50, true);
    // Version made by
    cdhView.setUint16(4, 20, true);
    // Version needed
    cdhView.setUint16(6, 20, true);
    // Flags
    cdhView.setUint16(8, 0, true);
    // Compression method
    cdhView.setUint16(10, 0, true);
    // Time
    cdhView.setUint16(12, 0, true);
    // Date
    cdhView.setUint16(14, 0, true);
    // CRC-32
    cdhView.setUint32(16, 0, true);
    // Compressed size
    cdhView.setUint32(20, file.data.length, true);
    // Uncompressed size
    cdhView.setUint32(24, file.data.length, true);
    // Filename length
    cdhView.setUint16(28, file.filename.length, true);
    // Extra field length
    cdhView.setUint16(30, 0, true);
    // Comment length
    cdhView.setUint16(32, 0, true);
    // Disk number start
    cdhView.setUint16(34, 0, true);
    // Internal attributes
    cdhView.setUint16(36, 0, true);
    // External attributes
    cdhView.setUint32(38, 0, true);
    // Local header offset
    cdhView.setUint32(42, file.offset, true);

    // Copy filename
    for (let i = 0; i < file.filename.length; i++) {
      cdh[46 + i] = file.filename[i];
    }

    centralDirHeaders.push(cdh);
    centralDirSize += cdhSize;
  }

  // Create end of central directory record
  const eocdSize = 22;
  const eocd = new Uint8Array(eocdSize);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  // Combine all parts
  const totalSize = offset + centralDirSize + eocdSize;
  const zipData = new Uint8Array(totalSize);
  let pos = 0;

  // Write local files
  for (const file of localFileHeaders) {
    zipData.set(file.header, pos);
    pos += file.header.length;
    zipData.set(file.data, pos);
    pos += file.data.length;
  }

  // Write central directory
  for (const cdh of centralDirHeaders) {
    zipData.set(cdh, pos);
    pos += cdh.length;
  }

  // Write EOCD
  zipData.set(eocd, pos);

  return zipData;
}

async function loadBlueprintRules() {
  // Extract blueprint name from URL
  const urlMatch = window.location.pathname.match(/\/blueprint\/([^\/]+)/);
  const blueprintName = urlMatch ? urlMatch[1] : '';

  if (!blueprintName) {
    throw new Error('Could not determine blueprint name');
  }

  // Get credentials from storage (auto-detects environment)
  const apiKey = await getLogikApiKeyForCurrentEnv();

  // Extract tenant and sector from current URL
  const currentUrl = new URL(window.location.href);
  const hostname = currentUrl.hostname;
  const parts = hostname.split('.');
  const tenant = parts[0];
  const sector = parts[1];

  // Fetch all rules from API with pagination
  let allRules = [];
  let page = 0;
  const pageSize = 5000;
  let hasMorePages = true;

  while (hasMorePages) {
    const rulesUrl = `https://${tenant}.${sector}.logik.io/api/admin/v2/blueprints/${blueprintName}/rules?page=${page}&size=${pageSize}&sort=modified%2CDESC`;
    const rulesResponse = await fetch(rulesUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!rulesResponse.ok) {
      throw new Error(`Failed to load rules: ${rulesResponse.status}`);
    }

    const rulesData = await rulesResponse.json();
    const pageRules = rulesData.content || [];

    console.log('[Content Script] Page', page, 'returned', pageRules.length, 'rules');

    allRules = allRules.concat(pageRules);

    // Check if there are more pages
    hasMorePages = pageRules.length === pageSize;
    page++;
  }

  console.log('[Content Script] Total blueprint rules from API:', allRules.length);
  return allRules;
}

async function loadTransactionRules() {
  const hostname = window.location.hostname;
  const baseUrl = `https://${hostname}`;

  try {
    // Fetch both transaction header and transaction line rules
    const [headerResponse, lineResponse] = await Promise.all([
      fetch(`${baseUrl}/a/txn-header/v2/blueprints/default/rules?size=1000&sort=modified%2CDESC`),
      fetch(`${baseUrl}/a/txn-line/v2/blueprints/default/rules?size=1000&sort=modified%2CDESC`)
    ]);

    if (!headerResponse.ok || !lineResponse.ok) {
      throw new Error('Failed to fetch transaction rules');
    }

    const headerData = await headerResponse.json();
    const lineData = await lineResponse.json();

    const headerRules = (headerData.content || []).map(rule => ({ ...rule, category: 'Transaction' }));
    const lineRules = (lineData.content || []).map(rule => ({ ...rule, category: 'Transaction Line' }));

    console.log('[Content Script] Transaction rules:', headerRules.length, 'Transaction Line rules:', lineRules.length);
    return [...headerRules, ...lineRules];
  } catch (error) {
    console.error('[Content Script] Error fetching transaction rules:', error);
    throw error;
  }
}

async function loadRules() {
  const statusEl = document.getElementById('logik-vc-rules-status');
  const errorEl = document.getElementById('logik-vc-rules-error');
  const gridBodyEl = document.getElementById('logik-vc-rules-grid-body');

  statusEl.textContent = 'Loading rules...';
  errorEl.textContent = '';

  try {
    let rules = [];

    // Check if we're on a transaction page
    if (isOnTransactionPage()) {
      console.log('[Content Script] Loading transaction rules...');
      rules = await loadTransactionRules();
    } else {
      console.log('[Content Script] Loading blueprint rules...');
      rules = await loadBlueprintRules();
    }

    // Filter to only active rules
    rules = rules.filter(rule => rule.status === 'active');
    console.log('[Content Script] Filtered active rules:', rules.length);

    if (rules.length === 0) {
      gridBodyEl.innerHTML = '<tr class="logik-vc-grid-placeholder"><td colspan="6" style="padding: 32px; text-align: center; color: #999; font-size: 12px;">No rules found</td></tr>';
      statusEl.textContent = '';
      return;
    }

    // Store rules globally for filtering
    window.logikAllRules = rules;
    window.logikRuleCount = rules.length;

    console.log('[Content Script] Rules loaded:', rules.length, rules);
    console.log('[Content Script] Grid body element:', gridBodyEl);

    // Determine grid type based on page, not rules
    if (isOnTransactionPage()) {
      console.log('[Content Script] Populating transaction rules grid');
      populateTransactionRulesGrid(rules);
    } else {
      console.log('[Content Script] Populating blueprint rules grid');
      populateRulesGrid(rules);
    }

    setupRulesFilters();
    statusEl.textContent = `Loaded ${rules.length} active rule(s)`;
  } catch (error) {
    console.error('[Content Script] Failed to load rules:', error);
    errorEl.textContent = `Error: ${error.message}`;
    gridBodyEl.innerHTML = '<tr class="logik-vc-grid-placeholder"><td colspan="6" style="padding: 32px; text-align: center; color: #d32f2f; font-size: 12px;">Failed to load rules</td></tr>';
  }
}

function populateRulesGrid(rulesToDisplay) {
  const gridBodyEl = document.getElementById('logik-vc-rules-grid-body');

  // Action type icons mapping (6 action types)
  const actionIcons = {
    determinationAction: { icon: '⚙️', label: 'Determination' },
    exclusionAction: { icon: '🚫', label: 'Exclusion' },
    inclusionAction: { icon: '➕', label: 'Inclusion' },
    messageAction: { icon: '💬', label: 'Message' },
    productAction: { icon: '📦', label: 'Product' },
    visibilityAction: { icon: '👁️', label: 'Hiding' }
  };

  if (rulesToDisplay.length === 0) {
    gridBodyEl.innerHTML = '<tr class="logik-vc-grid-placeholder"><td colspan="6" style="padding: 32px; text-align: center; color: #999; font-size: 12px;">No rules match the current filters</td></tr>';
    return;
  }

  // Populate grid
  gridBodyEl.innerHTML = rulesToDisplay
    .map(rule => {
      const lastModified = rule.modified ? new Date(rule.modified).toLocaleString() : 'N/A';

      // Build action icons based on actionSummary
      const actionIcons_list = [];
      if (rule.actionSummary) {
        Object.entries(rule.actionSummary).forEach(([key, value]) => {
          if (value > 0 && actionIcons[key]) {
            const { icon, label } = actionIcons[key];
            actionIcons_list.push(`<span title="${label}" style="cursor: help; font-size: 16px; margin-right: 4px;">${icon}</span>`);
          }
        });
      }

      return `
        <tr>
          <td class="logik-vc-grid-checkbox"><button class="logik-vc-copy-btn" data-text="${rule.variableName || ''}" title="Copy to clipboard">📋</button></td>
          <td class="logik-vc-grid-name">${rule.name || ''}</td>
          <td class="logik-vc-grid-variable">${rule.variableName || ''}</td>
          <td class="logik-vc-grid-description">${rule.description || ''}</td>
          <td class="logik-vc-grid-actions">${actionIcons_list.join('')}</td>
          <td class="logik-vc-grid-modified">${lastModified}</td>
        </tr>
      `;
    })
    .join('');

  // Set up copy button listeners
  gridBodyEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('logik-vc-copy-btn')) {
      const text = e.target.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = e.target.textContent;
        e.target.textContent = '✓';
        setTimeout(() => {
          e.target.textContent = originalText;
        }, 1500);
      });
    }
  });
}

function populateTransactionRulesGrid(rulesToDisplay) {
  const gridBodyEl = document.getElementById('logik-vc-rules-grid-body');

  // Action type icons mapping (6 action types)
  const actionIcons = {
    determinationAction: { icon: '⚙️', label: 'Determination' },
    exclusionAction: { icon: '🚫', label: 'Exclusion' },
    inclusionAction: { icon: '➕', label: 'Inclusion' },
    messageAction: { icon: '💬', label: 'Message' },
    productAction: { icon: '📦', label: 'Product' },
    visibilityAction: { icon: '👁️', label: 'Hiding' }
  };

  if (rulesToDisplay.length === 0) {
    gridBodyEl.innerHTML = '<tr class="logik-vc-grid-placeholder"><td colspan="6" style="padding: 32px; text-align: center; color: #999; font-size: 12px;">No rules match the current filters</td></tr>';
    return;
  }

  // Group rules by category (Transaction or Transaction Line)
  const transactionRules = rulesToDisplay.filter(r => r.category === 'Transaction');
  const transactionLineRules = rulesToDisplay.filter(r => r.category === 'Transaction Line');

  // Helper function to render a rules group
  const renderRulesGroup = (rules, categoryLabel) => {
    if (rules.length === 0) return '';

    return `
      <tr class="logik-vc-rules-category-header" data-category="${categoryLabel}">
        <td colspan="6" style="padding: 12px 16px; background: #f0f0f0; font-weight: 600; cursor: pointer; border-bottom: 1px solid #ddd;">
          <span class="logik-vc-category-toggle" style="margin-right: 8px;">▼</span>
          ${categoryLabel} (${rules.length})
        </td>
      </tr>
      ${rules
        .map(rule => {
          const lastModified = rule.modified ? new Date(rule.modified).toLocaleString() : 'N/A';
          const actionIcons_list = [];
          if (rule.actionSummary) {
            Object.entries(rule.actionSummary).forEach(([key, value]) => {
              if (value > 0 && actionIcons[key]) {
                const { icon, label } = actionIcons[key];
                actionIcons_list.push(`<span title="${label}" style="cursor: help; font-size: 16px; margin-right: 4px;">${icon}</span>`);
              }
            });
          }

          return `
            <tr class="logik-vc-rules-row" data-category="${categoryLabel}">
              <td class="logik-vc-grid-checkbox"><button class="logik-vc-copy-btn" data-text="${rule.variableName || ''}" title="Copy to clipboard">📋</button></td>
              <td class="logik-vc-grid-name">${rule.name || ''}</td>
              <td class="logik-vc-grid-variable">${rule.variableName || ''}</td>
              <td class="logik-vc-grid-description">${rule.description || ''}</td>
              <td class="logik-vc-grid-actions">${actionIcons_list.join('')}</td>
              <td class="logik-vc-grid-modified">${lastModified}</td>
            </tr>
          `;
        })
        .join('')}
    `;
  };

  // Render both categories
  gridBodyEl.innerHTML = renderRulesGroup(transactionRules, 'Transaction') + renderRulesGroup(transactionLineRules, 'Transaction Line');

  // Set up copy button listeners
  gridBodyEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('logik-vc-copy-btn')) {
      const text = e.target.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = e.target.textContent;
        e.target.textContent = '✓';
        setTimeout(() => {
          e.target.textContent = originalText;
        }, 1500);
      });
    }
  });

  // Set up category toggle functionality
  const categoryHeaders = gridBodyEl.querySelectorAll('.logik-vc-rules-category-header');
  categoryHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const category = header.dataset.category;
      const rows = gridBodyEl.querySelectorAll(`.logik-vc-rules-row[data-category="${category}"]`);
      const toggle = header.querySelector('.logik-vc-category-toggle');

      rows.forEach(row => {
        const isHidden = row.style.display === 'none';
        row.style.display = isHidden ? '' : 'none';
      });

      toggle.textContent = rows[0]?.style.display === 'none' ? '▶' : '▼';
    });
  });
}

function setupRulesFilters() {
  const searchInput = document.getElementById('logik-vc-search-input');
  const targetFieldInput = document.getElementById('logik-vc-target-field-input');
  const aggregateFieldInput = document.getElementById('logik-vc-aggregate-field-input');
  const actionFilterBtn = document.getElementById('logik-vc-action-filter-btn');
  const actionFilterMenu = document.getElementById('logik-vc-action-filter-menu');
  const actionCheckboxes = document.querySelectorAll('.logik-vc-action-checkbox');

  // Toggle filter menu
  actionFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    actionFilterMenu.style.display = actionFilterMenu.style.display === 'none' ? 'block' : 'none';
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.logik-vc-filter-dropdown')) {
      actionFilterMenu.style.display = 'none';
    }
  });

  // Filter on search input
  searchInput.addEventListener('input', applyRulesFilters);

  // Filter on target field input (with debounce)
  let targetFieldTimeout;
  targetFieldInput.addEventListener('input', () => {
    clearTimeout(targetFieldTimeout);
    targetFieldTimeout = setTimeout(applyRulesFilters, 500);
  });

  // Filter on aggregate field input (with debounce)
  let aggregateFieldTimeout;
  aggregateFieldInput.addEventListener('input', () => {
    clearTimeout(aggregateFieldTimeout);
    aggregateFieldTimeout = setTimeout(applyRulesFilters, 500);
  });

  // Filter on action checkbox change
  actionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyRulesFilters);
  });
}

async function applyRulesFilters() {
  const searchInput = document.getElementById('logik-vc-search-input');
  const targetFieldInput = document.getElementById('logik-vc-target-field-input');
  const aggregateFieldInput = document.getElementById('logik-vc-aggregate-field-input');
  const statusEl = document.getElementById('logik-vc-rules-status');
  const actionCheckboxes = document.querySelectorAll('.logik-vc-action-checkbox:checked');

  const searchTerm = searchInput.value.toLowerCase();
  const targetField = targetFieldInput.value.toLowerCase();
  const aggregateField = aggregateFieldInput.value.toLowerCase();
  const selectedActions = Array.from(actionCheckboxes).map(cb => cb.value);

  console.log('[Content Script] Applying filters:', { searchTerm, selectedActions: Array.from(actionCheckboxes).map(cb => cb.value), targetField, aggregateField });

  // Filter rules
  let filteredRules = window.logikAllRules.filter(rule => {
    // Text search filter
    if (searchTerm) {
      const matchesSearch =
        (rule.name || '').toLowerCase().includes(searchTerm) ||
        (rule.variableName || '').toLowerCase().includes(searchTerm) ||
        (rule.description || '').toLowerCase().includes(searchTerm);

      if (!matchesSearch) return false;
    }

    // Action type filter
    if (selectedActions.length > 0) {
      const hasSelectedAction = selectedActions.some(action => {
        return rule.actionSummary && rule.actionSummary[action] > 0;
      });

      if (!hasSelectedAction) return false;
    }

    return true;
  });

  // Target field filter - needs to fetch rule details
  if (targetField) {
    statusEl.textContent = 'Fetching rule details...';
    filteredRules = await filterByTargetField(filteredRules, targetField);
  }

  // Aggregate field filter - searches rule scripts
  if (aggregateField) {
    statusEl.textContent = 'Searching rule scripts for aggregate...';
    filteredRules = await filterByAggregate(filteredRules, aggregateField);
  }

  // Update status with filtered count
  if (searchTerm || selectedActions.length > 0 || targetField || aggregateField) {
    statusEl.textContent = `Showing ${filteredRules.length} of ${window.logikRuleCount} rule(s)`;
  } else {
    statusEl.textContent = `Loaded ${window.logikRuleCount} active rule(s)`;
  }

  // Populate grid with filtered rules
  populateRulesGrid(filteredRules);
}

async function filterByTargetField(rules, targetField) {
  // Initialize cache for rule details
  if (!window.logikRuleDetailsCache) {
    window.logikRuleDetailsCache = {};
  }

  // Get credentials (auto-detects environment)
  const apiKey = await getLogikApiKeyForCurrentEnv();
  if (!apiKey) return rules;

  // Extract tenant and sector
  const hostname = new URL(window.location.href).hostname;
  const parts = hostname.split('.');
  const tenant = parts[0];
  const sector = parts[1];

  // Fetch rule details for rules we don't have cached
  const rulesToFetch = rules.filter(rule => !window.logikRuleDetailsCache[rule.variableName]);

  if (rulesToFetch.length > 0) {
    const fetchPromises = rulesToFetch.map(rule =>
      fetch(`https://${tenant}.${sector}.logik.io/api/admin/v3/rules/${rule.variableName}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      })
        .then(r => r.ok ? r.json() : null)
        .then(details => {
          if (details) {
            window.logikRuleDetailsCache[rule.variableName] = details;
          }
          return details;
        })
        .catch(e => {
          console.error('Failed to fetch rule details:', e);
          return null;
        })
    );

    await Promise.all(fetchPromises);
  }

  // Filter rules by target field
  const searchLower = targetField.toLowerCase();
  return rules.filter(rule => {
    const details = window.logikRuleDetailsCache[rule.variableName];
    if (!details || !details.actions) return false;

    const matches = details.actions.some(action => {
      // Try multiple possible field properties
      const fieldName = action.fieldVariableName || action.fieldName || action.field;
      if (!fieldName) return false;

      const match = fieldName.toLowerCase().includes(searchLower);

      // Log for debugging
      if (match) {
        console.log('[Content Script] Found match in rule', rule.variableName, '- action field:', fieldName);
      }

      return match;
    });

    return matches;
  });
}

async function filterByAggregate(rules, aggregateField) {
  // Get credentials (auto-detects environment)
  const apiKey = await getLogikApiKeyForCurrentEnv();
  if (!apiKey) return rules;

  // Extract tenant, sector, and blueprint name
  const hostname = new URL(window.location.href).hostname;
  const parts = hostname.split('.');
  const tenant = parts[0];
  const sector = parts[1];
  const blueprintName = extractBlueprintNameFromUI();

  console.log('[Content Script] Searching for aggregate:', aggregateField, 'in blueprint:', blueprintName);

  // Initialize script cache
  if (!window.logikScriptCache) {
    window.logikScriptCache = {};
  }

  // For each rule, get full details and fetch script if it has one
  const rulesWithScripts = await Promise.all(
    rules.map(async (rule) => {
      try {
        // Fetch full rule details
        const ruleResponse = await fetch(
          `https://${tenant}.${sector}.logik.io/api/admin/v3/rules/${rule.variableName}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!ruleResponse.ok) {
          console.warn('[Content Script] Failed to fetch rule:', rule.variableName);
          return { rule, hasAggregate: false };
        }

        const ruleDetails = await ruleResponse.json();

        // Check if rule has a scriptId
        if (!ruleDetails.scriptId) {
          console.log('[Content Script] Rule has no script:', rule.variableName);
          return { rule, hasAggregate: false };
        }

        // Fetch the script content
        let scriptContent = window.logikScriptCache[ruleDetails.scriptId];
        if (!scriptContent) {
          const scriptResponse = await fetch(
            `https://${tenant}.${sector}.logik.io/api/admin/v1/scripts/${ruleDetails.scriptId}`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              }
            }
          );

          if (!scriptResponse.ok) {
            console.warn('[Content Script] Failed to fetch script:', ruleDetails.scriptId);
            return { rule, hasAggregate: false };
          }

          const scriptData = await scriptResponse.json();
          scriptContent = scriptData.content || '';
          window.logikScriptCache[ruleDetails.scriptId] = scriptContent;
        }

        // Search for aggregate field in script (exact match, case-insensitive)
        const hasAggregate = scriptContent.toLowerCase().includes(aggregateField.toLowerCase());

        if (hasAggregate) {
          console.log('[Content Script] Found aggregate in rule script:', rule.variableName);
        }

        return { rule, hasAggregate };
      } catch (error) {
        console.error('[Content Script] Error processing rule:', rule.variableName, error);
        return { rule, hasAggregate: false };
      }
    })
  );

  // Return only rules that have the aggregate
  return rulesWithScripts
    .filter(({ hasAggregate }) => hasAggregate)
    .map(({ rule }) => rule);
}

async function scanForTables() {
  const statusEl = document.getElementById('logik-vc-tables-status');
  const errorEl = document.getElementById('logik-vc-tables-error');
  const tablesEl = document.getElementById('logik-vc-tables');
  const scanBtn = document.getElementById('logik-vc-scan-tables');

  statusEl.textContent = 'Scanning for tables...';
  errorEl.textContent = '';
  scanBtn.disabled = true;

  try {
    const blueprintName = extractBlueprintNameFromUI();

    // Step 1: Get list of rules
    console.log('[Content Script] Getting rules for blueprint:', blueprintName);
    statusEl.textContent = 'Loading rules...';

    const apiKey = await getLogikApiKeyForCurrentEnv();

    const url = new URL(window.location.href);
    const parts = url.hostname.split('.');
    const tenant = parts[0];
    const sector = parts[1];

    const rulesResponse = await fetch(
      `https://${tenant}.${sector}.logik.io/api/admin/v2/blueprints/${blueprintName}/rules?page=0&size=1000&sort=modified%2CDESC`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );

    if (!rulesResponse.ok) throw new Error('Failed to load rules');
    const rulesData = await rulesResponse.json();
    const rules = rulesData.content || [];

    // Filter active rules
    const activeRules = rules.filter(r => r.active !== false);
    console.log('[Content Script] Found', activeRules.length, 'active rules');

    // Step 2: Get scriptIds from each rule (in parallel)
    statusEl.textContent = 'Loading rule details...';
    const ruleDetailPromises = activeRules.map(rule =>
      fetch(`https://${tenant}.${sector}.logik.io/api/admin/v3/rules/${rule.variableName}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      })
        .then(r => {
          if (!r.ok) {
            console.error(`Failed to get rule ${rule.variableName}: ${r.status}`);
            return null;
          }
          return r.json();
        })
        .catch(e => {
          console.error('Failed to get rule details:', e);
          return null;
        })
    );

    const ruleDetails = await Promise.all(ruleDetailPromises);
    console.log('[Content Script] Sample rule detail:', ruleDetails.find(Boolean));

    // Collect scriptIds and map them to rule info (name and variableName)
    const scriptIdToRules = new Map(); // Map<scriptId, Set<{name, variableName}>>
    ruleDetails.filter(Boolean).forEach((r, idx) => {
      const ruleVarName = activeRules[idx]?.variableName || r.variableName;
      // Check condition for scriptId
      if (r.condition && r.condition.scriptId) {
        if (!scriptIdToRules.has(r.condition.scriptId)) {
          scriptIdToRules.set(r.condition.scriptId, new Set());
        }
        scriptIdToRules.get(r.condition.scriptId).add({name: r.name, variableName: ruleVarName});
      }
      // Check actions for scriptIds
      if (r.actions && Array.isArray(r.actions)) {
        r.actions.forEach(action => {
          if (action.scriptId) {
            if (!scriptIdToRules.has(action.scriptId)) {
              scriptIdToRules.set(action.scriptId, new Set());
            }
            scriptIdToRules.get(action.scriptId).add({name: r.name, variableName: ruleVarName});
          }
        });
      }
    });

    const scriptIds = Array.from(scriptIdToRules.keys());

    console.log('[Content Script] Found', scriptIds.length, 'rules with scripts');
    console.log('[Content Script] Script IDs:', scriptIds);

    if (scriptIds.length === 0) {
      tablesEl.innerHTML = '<div style="padding: 16px; color: #666; font-size: 12px;">No managed tables found in this blueprint</div>';
      statusEl.textContent = '';
      return;
    }

    // Step 3: Get script contents (in parallel)
    statusEl.textContent = 'Scanning scripts for table references...';
    const scriptPromises = scriptIds.map(scriptId =>
      fetch(`https://${tenant}.${sector}.logik.io/api/admin/v1/scripts/${scriptId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      })
        .then(r => {
          if (!r.ok) {
            console.error(`Failed to get script ${scriptId}: ${r.status}`);
            return null;
          }
          return r.json();
        })
        .catch(e => {
          console.error('Failed to get script:', e);
          return null;
        })
    );

    const scripts = await Promise.all(scriptPromises);

    // Step 4: Extract table names from script content and track which scripts/rules reference them
    const tableToScriptIds = new Map(); // Map<tableName, Set<scriptId>>
    const tableRegex = /['"](SELECT\s+.*?\s+FROM\s+(\w+))['"]/gi;

    scripts.forEach((script, idx) => {
      if (script && script.content) {
        const scriptId = scriptIds[idx];
        console.log(`[Content Script] Script ${idx} (ID: ${scriptId}) content preview:`, script.content.substring(0, 500));
        let match;
        while ((match = tableRegex.exec(script.content)) !== null) {
          const tableName = match[2];
          if (tableName) {
            if (!tableToScriptIds.has(tableName)) {
              tableToScriptIds.set(tableName, new Set());
            }
            tableToScriptIds.get(tableName).add(scriptId);
          }
        }
      }
    });

    const tables = Array.from(tableToScriptIds.keys()).sort();
    console.log('[Content Script] Found tables:', tables);
    console.log('[Content Script] Table to script IDs:', tableToScriptIds);

    if (tables.length === 0) {
      tablesEl.innerHTML = '<div style="padding: 16px; color: #666; font-size: 12px;">No managed tables found in this blueprint</div>';
    } else {
      // Build collapsible table items with rules
      tablesEl.innerHTML = tables
        .map(table => {
          const scriptIdSet = tableToScriptIds.get(table);
          const rulesForTable = new Set();

          // Find all rules that reference this table's scripts
          scriptIdSet.forEach(scriptId => {
            const rulesForScript = scriptIdToRules.get(scriptId);
            if (rulesForScript) {
              rulesForScript.forEach(rule => rulesForTable.add(rule));
            }
          });

          const rulesList = Array.from(rulesForTable).sort((a, b) => a.name.localeCompare(b.name));
          const tableId = `table-${table.replace(/[^a-z0-9]/gi, '_')}`;

          // Extract blueprint name from URL (e.g., /blueprint/katanaDragonMasterlord/...)
          const urlMatch = window.location.pathname.match(/\/blueprint\/([^\/]+)/);
          const blueprintName = urlMatch ? urlMatch[1] : '';

          return `
            <div class="logik-vc-table-item">
              <div class="logik-vc-table-header" data-table-id="${tableId}">
                <span class="logik-vc-table-toggle">▶</span>
                <strong>${table}</strong>
              </div>
              <div class="logik-vc-table-rules" id="${tableId}" style="display: none;">
                ${rulesList.map(rule => `
                  <a href="https://${window.location.host}/blueprint/${blueprintName}/rule/${rule.variableName}" class="logik-vc-rule-item" target="_blank" rel="noopener noreferrer">
                    ${rule.name}
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        })
        .join('');
      statusEl.textContent = `Found ${tables.length} table(s)`;

      // Attach click handlers for table expansion/collapse
      document.querySelectorAll('.logik-vc-table-header').forEach(header => {
        header.addEventListener('click', function() {
          const tableId = this.getAttribute('data-table-id');
          const rulesDiv = document.getElementById(tableId);
          const toggle = this.querySelector('.logik-vc-table-toggle');

          if (rulesDiv.style.display === 'none') {
            rulesDiv.style.display = 'block';
            toggle.textContent = '▼';
          } else {
            rulesDiv.style.display = 'none';
            toggle.textContent = '▶';
          }
        });
      });
    }
  } catch (error) {
    console.error('[Content Script] Table scan failed:', error);
    errorEl.textContent = `Error: ${error.message}`;
    tablesEl.innerHTML = '';
  } finally {
    scanBtn.disabled = false;
  }
}

async function handleBulkDownload() {
  const checkboxes = document.querySelectorAll('.logik-vc-blueprint-checkbox:checked');

  if (checkboxes.length === 0) {
    await showThemedAlert('Please select at least one blueprint to download', 'No Selection');
    return;
  }

  const blueprintNames = Array.from(checkboxes).map(cb => cb.dataset.blueprintName);

  console.log('[Content Script] Bulk download requested for:', blueprintNames.length, 'blueprints');

  try {
    // Show loading state
    const downloadBtn = document.getElementById('logik-vc-download-selected');
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '⏳ Preparing...';
    downloadBtn.disabled = true;

    console.log('[Content Script] Sending bulk download request to service worker...');
    const response = await chrome.runtime.sendMessage({
      action: 'bulkDownload',
      blueprintNames: blueprintNames,
    });

    console.log('[Content Script] Received response:', response);

    if (!response) {
      throw new Error('No response from service worker');
    }

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.success) {
      throw new Error('Download request failed - please try again');
    }

    if (!response.data) {
      throw new Error('No download data received from service worker');
    }

    // Create parent ZIP manually (without JSZip to avoid CSP issues)
    console.log('[Content Script] Creating parent ZIP...');
    console.log('[Content Script] Response data structure:', response.data);

    const files = [];
    let totalSize = 0;

    for (const [blueprintName, versions] of Object.entries(response.data)) {
      console.log('[Content Script] Processing blueprint:', blueprintName, 'versions:', versions);

      if (!Array.isArray(versions)) {
        console.error('[Content Script] Versions is not an array:', versions);
        continue;
      }

      for (const version of versions) {
        console.log('[Content Script] Processing version:', version);

        // Convert base64 back to binary
        const binaryString = atob(version.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const filepath = `${blueprintName}/${version.filename}`;
        files.push({
          path: filepath,
          data: bytes
        });
        totalSize += bytes.length;
        console.log('[Content Script] Added file:', filepath, 'size:', bytes.length);
      }
    }

    console.log('[Content Script] Total files collected:', files.length, 'total size:', totalSize);

    if (files.length === 0) {
      throw new Error('No files were downloaded - the repository may be empty');
    }

    // Build simple ZIP manually
    console.log('[Content Script] Building ZIP with', files.length, 'files');
    const zipData = createSimpleZip(files);
    console.log('[Content Script] ZIP created, size:', zipData.length);
    const blob = new Blob([zipData], { type: 'application/zip' });

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blueprints-export-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Content Script] Download triggered successfully');
  } catch (error) {
    console.error('[Content Script] Bulk download failed:', error);
    await showThemedAlert(`${error.message}`, 'Download Failed');
  } finally {
    const downloadBtn = document.getElementById('logik-vc-download-selected');
    downloadBtn.innerHTML = '🗡️ Export';
    downloadBtn.disabled = false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportBlueprint') {
    exportBlueprint()
      .then((blueprintZip) => {
        sendResponse({ blueprintZip });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });

    return true;
  }
});

async function exportBlueprint() {
  try {
    // Get the blueprint name from the URL or UI
    // For now, extract from page title or ask for it
    const blueprintName = extractBlueprintNameFromUI();
    console.log('[Export] Step 1: Submitting export job for blueprint:', blueprintName);

    // Step 1: Submit the export job
    const jobResponse = await fetch('/a/admin/v1/bulk/blueprints/export', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([blueprintName]),
    });

    if (!jobResponse.ok) {
      throw new Error(`Export job submission failed: ${jobResponse.statusText}`);
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.id;
    console.log('[Export] Step 1 complete. Job ID:', jobId, 'Initial status:', jobData.status);

    // Step 2: Poll until job is complete
    let jobStatus = 'STARTED';
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds with 500ms intervals

    while (jobStatus !== 'COMPLETED' && attempts < maxAttempts) {
      await sleep(500); // Wait 500ms between polls
      attempts++;

      const statusResponse = await fetch(`/a/admin/v1/job/${jobId}`, {
        credentials: 'include',
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check job status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      jobStatus = statusData.status;
      console.log(`[Export] Poll ${attempts}: status = ${jobStatus}`);

      if (statusData.status === 'FAILED') {
        throw new Error('Export job failed on server');
      }
    }

    if (jobStatus !== 'COMPLETED') {
      throw new Error('Export job timed out');
    }
    console.log('[Export] Step 2 complete. Job status:', jobStatus);

    // Step 3: Download the ZIP file
    console.log('[Export] Step 3: Downloading ZIP from /a/admin/v2/bulk/export/', jobId);
    const downloadResponse = await fetch(`/a/admin/v2/bulk/export/${jobId}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/octet-stream',
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.statusText}`);
    }

    const blob = await downloadResponse.blob();
    console.log('[Export] Downloaded blob size:', blob.size, 'bytes');
    const arrayBuffer = await blob.arrayBuffer();
    console.log('[Export] Export complete. ZIP array buffer size:', arrayBuffer.byteLength);
    return {
      data: Array.from(new Uint8Array(arrayBuffer)),
      filename: 'blueprint.zip',
      blueprintName: blueprintName,
    };
  } catch (error) {
    console.error('[Export] Error:', error);
    throw new Error(`Failed to export blueprint: ${error.message}`);
  }
}

function extractBlueprintNameFromUI() {
  // Extract blueprint name from URL
  // URL pattern: /blueprint/{blueprintName}/...
  const match = window.location.pathname.match(/\/blueprint\/([^\/]+)\//);
  if (match && match[1]) {
    console.log('[Export] Extracted blueprint name from URL:', match[1]);
    return match[1];
  }

  // Fallback if URL pattern doesn't match
  console.warn('[Export] Could not extract blueprint name from URL:', window.location.pathname);
  return 'blueprint';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
