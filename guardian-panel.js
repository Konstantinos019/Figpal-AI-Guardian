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
    <div class="guardian-changes-flow" data-step="0">
      <!-- STEP 0: Component Diff View -->
      <div class="guardian-step step-0">
        <div class="guardian-diff-container">
          <div class="guardian-diff-header">
            <div>
              <div class="guardian-diff-title">Component Diff — Badge</div>
              <div class="guardian-diff-subtitle">Figma vs Code</div>
            </div>
            <div class="guardian-diff-actions">
               <button class="guardian-btn-explore">Explore Changes</button>
               <button class="guardian-btn-dismiss">Dismiss</button>
            </div>
          </div>
          
          <div class="guardian-diff-toggle-group">
            <button class="guardian-diff-toggle-btn active">Overview</button>
            <button class="guardian-diff-toggle-btn">Details</button>
            <button class="guardian-diff-toggle-btn">Comments</button>
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
            <span class="guardian-decision-hint">Select mismatches and choose an alignment option</span>
          </div>
        </div>
      </div>

      <!-- STEP 1: Suggested Improvements View -->
      <div class="guardian-step step-1" style="display: none;">
        <div class="guardian-improvements-container">
          <!-- Sub-navigation Stepper -->
          <div class="guardian-stepper">
            <div class="guardian-stepper-step active">
              <div class="guardian-stepper-number active">1</div>
              <span>Review</span>
            </div>
            <div class="guardian-stepper-step">
              <div class="guardian-stepper-number">2</div>
              <span>Preview</span>
            </div>
            <div class="guardian-stepper-step">
              <div class="guardian-stepper-number">3</div>
              <span>Success</span>
            </div>
          </div>

          <!-- Header Section -->
          <div class="guardian-improvements-header">
            <div class="guardian-improvements-mascot">
              <img src="${ASSETS.avatar}" alt="FigPal">
            </div>
            <h2 class="guardian-improvements-title">Suggested Improvements</h2>
          </div>
          <p class="guardian-improvements-desc">Explore opportunities to enhance alignment with your design system. From nuanced guidance suggestions to specific technical issues.</p>

          <!-- Improvement Cards -->
          <div class="guardian-improvements-cards">
            <!-- Card 1: Enhanced focus states -->
            <div class="guardian-improvement-card">
              <div class="guardian-improvement-icon accessibility">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4l3 3"/>
                </svg>
              </div>
              <div class="guardian-improvement-content">
                <div class="guardian-improvement-top">
                  <span class="guardian-improvement-category">ACCESSIBILITY</span>
                  <div class="guardian-improvement-badges">
                    <span class="guardian-improvement-badge">A11y</span>
                    <span class="guardian-improvement-badge">Required</span>
                  </div>
                </div>
                <h3 class="guardian-improvement-card-title">Enhanced focus states</h3>
                <p class="guardian-improvement-card-desc">Improved keyboard navigation with visible focus indicators meeting WCAG 2.1 AA standards.</p>
                <div class="guardian-improvement-meta">
                  <span>Impact: <strong>High</strong></span>
                  <span>Affected: <strong>12 instances</strong></span>
                </div>
              </div>
              <div class="guardian-improvement-chevron">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>

            <!-- Card 2: Updated color tokens -->
            <div class="guardian-improvement-card">
              <div class="guardian-improvement-icon visual">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              </div>
              <div class="guardian-improvement-content">
                <div class="guardian-improvement-top">
                  <span class="guardian-improvement-category">VISUAL</span>
                  <div class="guardian-improvement-badges">
                    <span class="guardian-improvement-badge">Visual</span>
                    <span class="guardian-improvement-badge">Recommended</span>
                  </div>
                </div>
                <h3 class="guardian-improvement-card-title">Updated color tokens</h3>
                <p class="guardian-improvement-card-desc">Refined button colors for better contrast and brand alignment across light and dark modes.</p>
                <div class="guardian-improvement-meta">
                  <span>Impact: <strong>Medium</strong></span>
                  <span>Affected: <strong>12 instances</strong></span>
                </div>
              </div>
              <div class="guardian-improvement-chevron">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>

            <!-- Card 3: New variant: ghost-primary -->
            <div class="guardian-improvement-card">
              <div class="guardian-improvement-icon enhancement">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div class="guardian-improvement-content">
                <div class="guardian-improvement-top">
                  <span class="guardian-improvement-category">ENHANCEMENT</span>
                  <div class="guardian-improvement-badges">
                    <span class="guardian-improvement-badge">New</span>
                    <span class="guardian-improvement-badge">Optional</span>
                  </div>
                </div>
                <h3 class="guardian-improvement-card-title">New variant: ghost-primary</h3>
                <p class="guardian-improvement-card-desc">A new subtle variant that maintains primary color signaling without strong visual weight.</p>
                <div class="guardian-improvement-meta">
                  <span>Impact: <strong>Low</strong></span>
                  <span>Affected: <strong>Optional</strong></span>
                </div>
              </div>
              <div class="guardian-improvement-chevron">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="guardian-improvements-footer">
            <button class="guardian-btn-back">← Back to Diff</button>
            <button class="guardian-improvements-cta">Preview how to fix</button>
          </div>
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
        <button class="guardian-control-btn guardian-dock-toggle" title="Toggle dock position">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="1.5" width="5" height="13" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="9.5" y="1.5" width="5" height="13" rx="1" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
          </svg>
        </button>
        <button class="guardian-control-btn guardian-close-btn"><img src="${ASSETS.close}" style="width:16px"></button>
      </div>
    </div>
    
    <div class="guardian-panel-body">
      ${TABS_CONTENT.home}
    </div>
  `;

  document.body.appendChild(panel);

  // Listen for open command from other components
  window.addEventListener('guardian-panel-open', () => {
    if (!isActive) togglePanel(true);
  });

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

  // Dock toggle button - switch between bottom and right modes
  const dockToggleBtn = panel.querySelector('.guardian-dock-toggle');
  let isDockedRight = localStorage.getItem('guardian-dock-mode') === 'right';

  const applyDockMode = () => {
    if (isDockedRight) {
      document.body.classList.add('guardian-docked-right');
    } else {
      document.body.classList.remove('guardian-docked-right');
    }
    localStorage.setItem('guardian-dock-mode', isDockedRight ? 'right' : 'bottom');
  };

  // Apply saved dock mode on init
  applyDockMode();

  if (dockToggleBtn) {
    dockToggleBtn.onclick = () => {
      isDockedRight = !isDockedRight;
      applyDockMode();

      // Re-dispatch resize event for FigPal to adjust
      if (isActive) {
        const height = isDockedRight ? 0 : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--guardian-panel-height')) || 400);
        window.dispatchEvent(new CustomEvent('guardian-panel-resize', { detail: { height, isActive, isDockedRight } }));
      }
    };
  }

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

    // 2. Explore Changes - transition to Step 1 (improvements)
    if (target.closest('.guardian-btn-explore')) {
      const flowContainer = panel.querySelector('.guardian-changes-flow');
      if (flowContainer) {
        flowContainer.querySelector('.step-0').style.display = 'none';
        flowContainer.querySelector('.step-1').style.display = 'block';
        flowContainer.dataset.step = '1';
        console.log("Guardian: Transitioning to Suggested Improvements...");
      }
    }

    // 3. Dismiss Changes - just log for now
    if (target.closest('.guardian-btn-dismiss')) {
      console.log("Guardian: Changes dismissed.");
      // Could hide the diff or show a dismissed state
    }

    // 3b. Back to Diff - transition back to Step 0
    if (target.closest('.guardian-btn-back')) {
      const flowContainer = panel.querySelector('.guardian-changes-flow');
      if (flowContainer) {
        flowContainer.querySelector('.step-1').style.display = 'none';
        flowContainer.querySelector('.step-0').style.display = 'block';
        flowContainer.dataset.step = '0';
        console.log("Guardian: Back to Diff view...");
      }
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

  // 4. Resize Logic (supports both bottom and right dock modes)
  // Uses a transparent overlay to capture mouse events reliably
  const resizeHandle = panel.querySelector('.guardian-resize-handle');
  let isResizing = false;
  let startY, startX, startHeight, startWidth;
  let overlay = null;

  const createOverlay = () => {
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99999;
      cursor: ${isDockedRight ? 'col-resize' : 'row-resize'};
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', stopResize);
    overlay.addEventListener('mouseleave', stopResize);
  };

  const removeOverlay = () => {
    if (overlay) {
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', stopResize);
      overlay.removeEventListener('mouseleave', stopResize);
      overlay.remove();
      overlay = null;
    }
  };

  const stopResize = () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      removeOverlay();
    }
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    if (isDockedRight) {
      const dx = startX - e.clientX;
      let newWidth = startWidth + dx;
      if (newWidth < 300) newWidth = 300;
      if (newWidth > window.innerWidth - 200) newWidth = window.innerWidth - 200;
      document.documentElement.style.setProperty('--guardian-panel-width', `${newWidth}px`);
    } else {
      const dy = startY - e.clientY;
      let newHeight = startHeight + dy;
      if (newHeight < 200) newHeight = 200;
      if (newHeight > window.innerHeight - 100) newHeight = window.innerHeight - 100;
      document.documentElement.style.setProperty('--guardian-panel-height', `${newHeight}px`);
      if (isActive) {
        window.dispatchEvent(new CustomEvent('guardian-panel-resize', { detail: { height: newHeight, isActive: true } }));
      }
    }
  };

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startX = e.clientX;

    const currentHeightStr = getComputedStyle(document.documentElement).getPropertyValue('--guardian-panel-height').trim();
    const currentWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--guardian-panel-width').trim();
    startHeight = parseInt(currentHeightStr) || 400;
    startWidth = parseInt(currentWidthStr) || 400;

    resizeHandle.classList.add('active');
    document.body.style.userSelect = 'none';
    createOverlay();
    e.preventDefault();
    e.stopPropagation();
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

// Ensure initGuardian includes the listener
// Note: We are not changing initGuardian definition here, just ensuring where it is called is clean.
// The listener needs to be INSIDE initGuardian function at the top of the file, around line 440? No.
// initGuardian is defined around line 261. 
// We need to edit initGuardian function body.


// Run check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForFigma);
} else {
  waitForFigma();
}

// Listen globally for open command

