// Guardian Bottom Panel - High Precision Implementation

const getAssetUrl = (path) => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  return path;
};

const ASSETS = {
  avatar: getAssetUrl("assets/avatar.png"),
  homeIcon: getAssetUrl("assets/homeIcon.svg"),
  changesIcon: getAssetUrl("assets/changesIcon.svg"),
  docsIcon: getAssetUrl("assets/docsIcon.svg"),
  scanIcon: getAssetUrl("assets/scanIcon.svg"),
  fileIcon: getAssetUrl("assets/fileIcon.svg"),
  chevron: getAssetUrl("assets/chevron.svg"),
  close: getAssetUrl("assets/close.svg"),
  // New icons for Diff Table
  mismatch: "data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 6 1ZM6 8.5C5.72 8.5 5.5 8.28 5.5 8V6C5.5 5.72 5.72 5.5 6 5.5C6.28 5.5 6.5 5.72 6.5 6V8C6.5 8.28 6.28 8.5 6 8.5ZM6 4.5C5.72 4.5 5.5 4.28 5.5 4C5.5 3.72 5.72 3.5 6 3.5C6.28 3.5 6.5 3.72 6.5 4C6.5 4.28 6.28 4.5 6 4.5Z' fill='%23EF4444'/%3E%3C/svg%3E",
  match: "data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 6 1ZM4.5 8L2.5 6L3.2 5.3L4.5 6.6L8.8 2.3L9.5 3L4.5 8Z' fill='%2322C55E'/%3E%3C/svg%3E"
};

const TABS_CONTENT = {
  home: `
    <div class="guardian-section">
      <h2 class="guardian-section-title">Run a scan</h2>
      <div class="guardian-audit-card">
        <div class="guardian-card-icon-box"><img src="${ASSETS.scanIcon}"></div>
        <div class="guardian-card-text">
          <div class="guardian-card-text-title">Scan selection</div>
          <div class="guardian-card-text-subtitle">Check design UI or code</div>
        </div>
      </div>
      <div class="guardian-audit-card">
        <div class="guardian-card-icon-box"><img src="${ASSETS.fileIcon}"></div>
        <div class="guardian-card-text">
          <div class="guardian-card-text-title">Scan current file</div>
          <div class="guardian-card-text-subtitle">Check all components or code</div>
        </div>
      </div>
    </div>

    <div class="guardian-section">
      <h2 class="guardian-section-title">Data sources</h2>
      <p style="font-size: 14px; opacity: 0.6; margin-bottom: 12px;">Data sources added to your file</p>
      <div class="guardian-audit-card">
        <div style="width: 80px; height: 56px; background: #f3f4f6; border-radius: 10px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 24px">🎨</span></div>
        <div class="guardian-card-text">
          <div class="guardian-card-text-title">Team project Figma file</div>
          <div class="guardian-card-text-subtitle">Components, instances</div>
        </div>
      </div>
      <div class="guardian-audit-card">
        <div style="width: 80px; height: 56px; background: #2b2838; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;"><span style="font-size: 24px">🦊</span></div>
        <div class="guardian-card-text">
          <div class="guardian-card-text-title">Pajamas Design System</div>
          <div class="guardian-card-text-subtitle">Tokens, variants</div>
        </div>
      </div>
    </div>

    <div class="guardian-section">
      <h2 class="guardian-section-title">Recent activity</h2>
      <div class="guardian-activity-item">
        <div class="activity-dot green"></div>
        <div>
          <div class="activity-title">Scanned 12 components</div>
          <div class="activity-time">2 hours ago</div>
        </div>
      </div>
      <div class="guardian-activity-item">
        <div class="activity-dot blue"></div>
        <div>
          <div class="activity-title">Applied button variant update</div>
          <div class="activity-time">Yesterday</div>
        </div>
      </div>
    </div>
  `,
  changes: `
    <div class="guardian-diff-container">
      <div class="guardian-diff-header">
        <div>
          <div class="guardian-diff-title">Component Diff — Badge</div>
          <div class="guardian-diff-subtitle">Figma vs Code</div>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 32px;">
           <button class="guardian-btn-explore" style="background: #155dfc; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Explore Changes</button>
           <button class="guardian-btn-dismiss" style="background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Dismiss</button>
        </div>
        <div class="guardian-diff-toggle-group">
          <button class="guardian-diff-toggle-btn active">Overview</button>
          <button class="guardian-diff-toggle-btn">Details</button>
          <button class="guardian-diff-toggle-btn">Comments</button>
        </div>
      </div>
      
      <div class="guardian-diff-table-header">
        <div>Aspect</div>
        <div>Design (Figma)</div>
        <div>Code (System)</div>
        <div>Status</div>
      </div>
      
      <div class="guardian-diff-content">
        <!-- Row 1: Background Color -->
        <div class="guardian-diff-row">
          <div class="guardian-diff-cell">
            <input type="checkbox" class="guardian-diff-checkbox" checked>
            <span>Background color</span>
          </div>
          <div class="guardian-diff-cell">
            <div class="guardian-color-preview" style="background: linear-gradient(to right, #a855f7, #ec4899);"></div>
            <span class="guardian-value-pill">linear-gradient</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">token/color/badge/info</span>
          </div>
          <div class="guardian-badge-status mismatch">
            <img src="${ASSETS.mismatch}"> Mismatch
          </div>
        </div>

        <!-- Row 2: Icon Name -->
        <div class="guardian-diff-row">
          <div class="guardian-diff-cell">
            <input type="checkbox" class="guardian-diff-checkbox" checked>
            <span>Icon name</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">custom-star</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">icon/star-filled</span>
          </div>
          <div class="guardian-badge-status mismatch">
            <img src="${ASSETS.mismatch}"> Mismatch
          </div>
        </div>

        <!-- Row 3: Font Size (Match) -->
        <div class="guardian-diff-row">
          <div class="guardian-diff-cell">
            <input type="checkbox" class="guardian-diff-checkbox" style="opacity:0.3" disabled>
            <span>Font size</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">14px</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">14px</span>
          </div>
          <div class="guardian-badge-status match">
            <img src="${ASSETS.match}"> Match
          </div>
        </div>

        <!-- Row 4: Border Radius (Match) -->
        <div class="guardian-diff-row">
          <div class="guardian-diff-cell">
            <input type="checkbox" class="guardian-diff-checkbox" style="opacity:0.3" disabled>
            <span>Border radius</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">9999px</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">9999px</span>
          </div>
          <div class="guardian-badge-status match">
            <img src="${ASSETS.match}"> Match
          </div>
        </div>

        <!-- Row 5: Variant Naming -->
        <div class="guardian-diff-row">
          <div class="guardian-diff-cell">
            <input type="checkbox" class="guardian-diff-checkbox" checked>
            <span>Variant naming</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">Badge/Custom</span>
          </div>
          <div class="guardian-diff-cell">
            <span class="guardian-value-pill">Badge/Info</span>
          </div>
          <div class="guardian-badge-status mismatch">
            <img src="${ASSETS.mismatch}"> Mismatch
          </div>
        </div>
      </div>

      <div class="guardian-decision-footer">
        <label class="guardian-radio-label">
          Select mismatches and choose an alignment option
        </label>
        
        <div class="guardian-radio-group">
           <button class="guardian-action-btn">
             <span style="font-size:16px">📤</span> Send decision to dev
           </button>
        </div>
      </div>
    </div>
  `,
  docs: `
    <div class="guardian-docs-layout">
       <div class="guardian-doc-card">
          <div class="guardian-doc-header">
             <div>
                <div class="guardian-doc-title">Typography scale update</div>
                <div class="guardian-doc-meta">
                   <div class="guardian-doc-meta-item">Sarah Chen</div>
                   <div class="guardian-doc-meta-item">•</div>
                   <div class="guardian-doc-meta-item">2026-02-05 16:45</div>
                </div>
             </div>
             <div class="guardian-doc-status applied">Applied</div>
          </div>
          <div class="guardian-doc-description">
             Applied new type scale to heading components. Updated line-heights for H1-H3 to improve readability on mobile breakpoints.
          </div>
          <div class="guardian-doc-links">
             <a href="#" class="guardian-doc-resource-link">🎨 Typography</a>
             <a href="#" class="guardian-doc-resource-link">💻 theme.css</a>
             <a href="#" class="guardian-doc-resource-link">📄 Brand Guidelines</a>
          </div>
          <div style="margin-top: 12px; font-size: 11px; color: #cbd5e1;">ID: dec-002</div>
       </div>

       <div class="guardian-doc-card">
          <div class="guardian-doc-header">
             <div>
                <div class="guardian-doc-title">Spacing system alignment</div>
                <div class="guardian-doc-meta">
                   <div class="guardian-doc-meta-item">Marcus Rodriguez</div>
                   <div class="guardian-doc-meta-item">•</div>
                   <div class="guardian-doc-meta-item">2026-02-04 09:12</div>
                </div>
             </div>
             <div class="guardian-doc-status documented">Documented</div>
          </div>
          <div class="guardian-doc-description">
             Documented decision to maintain custom 12px gap in product cards to balance visual density on smaller viewports.
          </div>
          <div class="guardian-doc-links">
             <a href="#" class="guardian-doc-resource-link">🎨 Product Card</a>
             <a href="#" class="guardian-doc-resource-link">📄 Spacing Guidelines</a>
          </div>
          <div style="margin-top: 12px; font-size: 11px; color: #cbd5e1;">ID: dec-001</div>
       </div>
       
       <div style="text-align: center; color: #94a3b8; font-size: 13px; padding-top: 12px;">
          This documentation is auto-generated from Guardian activity.
       </div>
    </div>
  `
};

function initGuardian() {
  console.log("Guardian: Initializing Precision Panel...");

  // 1. Create the panel
  const panel = document.createElement('div');
  panel.id = 'guardian-bottom-panel';

  panel.innerHTML = `
    <div class="guardian-resize-handle"></div>
    <div class="guardian-tabs-header">
      <div class="guardian-avatar-wrapper">
        <img src="${ASSETS.avatar}" alt="Guardian">
      </div>
      
      <div class="guardian-tab-btns-container">
        <button class="guardian-tab-btn active" data-tab="home">
          <img src="${ASSETS.homeIcon}"> Home
        </button>
        <button class="guardian-tab-btn" data-tab="changes">
          <img src="${ASSETS.changesIcon}"> Changes
        </button>
        <button class="guardian-tab-btn" data-tab="docs">
          <img src="${ASSETS.docsIcon}"> Documentation
        </button>
      </div>

      <div class="guardian-controls-right">
        <button class="guardian-control-btn"><img src="${ASSETS.chevron}" style="width:16px"></button>
        <button class="guardian-control-btn guardian-close-btn"><img src="${ASSETS.close}" style="width:16px"></button>
      </div>
    </div>
    
    <div class="guardian-panel-body">
      ${TABS_CONTENT.home}
    </div>
  `;

  document.body.appendChild(panel);

  // 2. Launcher button
  const launcher = document.createElement('button');
  launcher.id = 'guardian-launcher-btn';
  launcher.innerHTML = `🛡️ <span>Guardian Audit</span>`;

  let isActive = false;
  const togglePanel = (active) => {
    isActive = active;
    if (isActive) {
      document.body.classList.add('guardian-active');
      launcher.innerHTML = `🛡️ <span>Close Audit</span>`;
    } else {
      document.body.classList.remove('guardian-active');
      launcher.innerHTML = `🛡️ <span>Guardian Audit</span>`;
    }
    // Dispatch event for other components (e.g., FigPal character)
    const height = isActive ? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--guardian-panel-height')) || 400) : 0;
    window.dispatchEvent(new CustomEvent('guardian-panel-resize', { detail: { height, isActive } }));
  };

  launcher.onclick = () => togglePanel(!isActive);

  // Add keyboard shortcut (Option/Alt + F)
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'f' || e.code === 'KeyF')) {
      e.preventDefault();
      togglePanel(!isActive);
    }
  });

  // Close buttons
  panel.querySelector('.guardian-close-btn').onclick = () => togglePanel(false);

  // Handle interactive elements via delegation
  panel.addEventListener('click', (e) => {
    const target = e.target;

    // 1. Doc Resource Links
    if (target.closest('.guardian-doc-resource-link')) {
      e.preventDefault();
      const link = target.closest('.guardian-doc-resource-link');
      console.log(`Guardian: Opening resource ${link.textContent.trim()}`);
      alert(`Guardian: Opening ${link.textContent.trim()} in new tab`);
    }

    // 2. Explore Changes
    if (target.closest('.guardian-btn-explore')) {
      console.log("Guardian: Exploring changes...");
      alert("Guardian: Highlighting component differences on canvas...");
    }

    // 3. Dismiss Changes
    if (target.closest('.guardian-btn-dismiss')) {
      console.log("Guardian: Dismissing changes...");
      alert("Guardian: Changes dismissed.");
    }

    // 4. Audit Cards
    if (target.closest('.guardian-audit-card')) {
      const titleEl = target.closest('.guardian-audit-card').querySelector('.guardian-card-text-title');
      if (titleEl) {
        const cardTitle = titleEl.textContent;
        console.log(`Guardian: Audit card clicked: ${cardTitle}`);
        alert(`Guardian: Starting scan for ${cardTitle}...`);
      }
    }

    // 5. Action Buttons (Send to dev)
    if (target.closest('.guardian-action-btn')) {
      console.log("Guardian: Sending decision to dev...");
      alert("Guardian: Decision sent to development queue.");
    }
  });

  // Stop Propagation for specific events to prevent Figma interaction
  ['wheel', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup'].forEach(eventType => {
    panel.addEventListener(eventType, (e) => {
      e.stopPropagation();
    }, { passive: false }); // passive: false allows preventDefault if needed, though we just stop propagation here
  });

  // Tab switching
  const tabs = panel.querySelectorAll('.guardian-tab-btn');
  const body = panel.querySelector('.guardian-panel-body');

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      body.innerHTML = TABS_CONTENT[tabName];
    };
  });

  console.log("Guardian: Precision Panel Ready.");

  // 4. Resize Logic
  const resizeHandle = panel.querySelector('.guardian-resize-handle');
  let isResizing = false;
  let startY, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    // Get current height from CSS var or computed style
    const currentHeightStr = getComputedStyle(document.documentElement).getPropertyValue('--guardian-panel-height').trim();
    startHeight = parseInt(currentHeightStr) || 400; // Default fallback

    resizeHandle.classList.add('active');
    document.body.style.cursor = 'row-resize';
    e.preventDefault(); // Prevent text selection
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const dy = startY - e.clientY; // Drag up increases height
    let newHeight = startHeight + dy;

    // Constraints
    if (newHeight < 200) newHeight = 200;
    if (newHeight > window.innerHeight - 100) newHeight = window.innerHeight - 100;

    document.documentElement.style.setProperty('--guardian-panel-height', `${newHeight}px`);

    // Dispatch resize event
    if (isActive) {
      window.dispatchEvent(new CustomEvent('guardian-panel-resize', { detail: { height: newHeight, isActive: true } }));
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('active');
      document.body.style.cursor = '';
    }
  });
}

// Check for Figma load
function waitForFigma() {
  if (document.getElementById('react-page')) {
    initGuardian();
  } else {
    // If not found, observe changes
    const observer = new MutationObserver((mutations, obs) => {
      if (document.getElementById('react-page')) {
        initGuardian();
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Run check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForFigma);
} else {
  waitForFigma();
}
