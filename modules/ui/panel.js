// modules/ui/panel.js
// Figpal Panel Hub: Entry point for Sprite Creator and Legacy Controls.
(function () {
    'use strict';

    const FP = window.FigPal;

    function init() {
        console.log('FigPal: Panel init called');
        if (document.getElementById('figpal-panel-overlay')) {
            console.log('FigPal: Panel overlay already exists');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'figpal-panel-overlay';
        overlay.className = 'figpal-panel-overlay';

        const currentPal = {
            category: "Object",
            subType: "Rock",
            colorName: "Gray",
            color: "#949494",
            name: "",
            accessory: "None",
            parts: ["body"]
        };

        const subTypeRegistry = {
            "Object": ["Rock", "Cloud", "Star", "Mushroom", "Flower", "Bus", "Poo", "Ball", "Rainbow"],
            "Animal": ["Rock"], // Placeholder
            "Food": ["Rock"],   // Placeholder
            "Figma": ["Rock"]   // Placeholder
        };

        const accessoryRegistry = [
            "None", "Angry", "Antennae", "BeigeHat", "BlueHat", "Candle", "Excitement", "Flower",
            "GrayHat", "GreenBeanie", "Halo", "Heart", "Lightbulb", "PartyHat", "PinkBeanie",
            "PropellerHat", "Question", "RedBeanie", "Sparkle", "Sprout", "Sweat", "Thinking",
            "Tophat", "WitchHat", "WizardHat"
        ];

        // Load saved state
        chrome.storage.local.get(['activePal'], (res) => {
            if (res.activePal) {
                Object.assign(currentPal, res.activePal);
                FP.state.activePal = { ...currentPal };
                renderPreview();
                if (FP.injector?.reRenderFollower) FP.injector.reRenderFollower();
            }
        });

        const cycleSubType = (direction) => {
            const types = subTypeRegistry[currentPal.category] || ["Rock"];
            let idx = types.indexOf(currentPal.subType);
            if (idx === -1) idx = 0;

            idx = (idx + direction + types.length) % types.length;
            currentPal.subType = types[idx];
            renderPreview();
        };

        const cycleAccessory = (direction) => {
            let idx = accessoryRegistry.indexOf(currentPal.accessory);
            if (idx === -1) idx = 0;

            idx = (idx + direction + accessoryRegistry.length) % accessoryRegistry.length;
            currentPal.accessory = accessoryRegistry[idx];
            renderPreview();
        };

        const safeIcon = (name, color) => (FP.sprite && FP.sprite.getIcon) ? FP.sprite.getIcon(name, color) : '';
        const safeAssemble = (opts) => (FP.sprite && FP.sprite.assemble) ? FP.sprite.assemble(opts) : '';

        const getIconFileHTML = (name) => {
            const url = chrome.runtime.getURL(`assets/Icons/${name}.svg`);
            console.log(`FigPal Debug: Icon lookup -> name="${name}", url="${url}"`);
            return `<div class="figpal-icon-mask" style="-webkit-mask-image: url('${url}'); mask-image: url('${url}');"></div>`;
        };

        const renderPreview = () => {
            const previewContainer = overlay.querySelector('.figpal-pal-layers');
            if (previewContainer) {
                previewContainer.innerHTML = safeAssemble({
                    category: currentPal.category,
                    subType: currentPal.subType,
                    colorName: currentPal.colorName,
                    color: currentPal.color,
                    accessory: currentPal.accessory,
                    parts: currentPal.parts
                });
            }
            // Update stage platform
            const stageDisc = overlay.querySelector('.figpal-stage-disc');
            if (stageDisc && FP.sprite && FP.sprite.getStage) {
                stageDisc.innerHTML = FP.sprite.getStage(currentPal.category);
            }
        };

        overlay.innerHTML = `
            <div id="figpal-panel-hub" class="figpal-panel-container">
                <div class="figpal-panel-header">
                    <span class="figpal-header-title">Customize your FigPal</span>
                    <button class="figpal-panel-close-abs">×</button>
                </div>
                
                <div class="figpal-panel-content">
                    <div class="figpal-panel-main">
                        <!-- Tab Bar -->
                        <div class="figpal-tab-bar">
                            <div class="figpal-tab" data-tab="Animal">
                                ${getIconFileHTML('Animal')}
                            </div>
                            <div class="figpal-tab" data-tab="Food">
                                ${getIconFileHTML('Food')}
                            </div>
                            <div class="figpal-tab active" data-tab="Object">
                                ${getIconFileHTML('Object')}
                            </div>
                            <div class="figpal-tab" data-tab="Figma">
                                ${getIconFileHTML('Figma')}
                            </div>
                        </div>

                        <!-- Construction Palette Container -->
                        <div class="figpal-construction-palette">
                            <div class="figpal-stage-area">
                                <div class="figpal-nav-overlay left">
                                    <button class="figpal-nav-btn" data-action="accessory-left"><span class="chevron left"></span></button>
                                    <button class="figpal-nav-btn" data-action="object-left"><span class="chevron left"></span></button>
                                </div>

                                <div class="figpal-pal-preview">
                                    <div class="figpal-pal-layers">
                                        ${safeAssemble(currentPal)}
                                    </div>
                                    <div class="figpal-stage-disc">
                                        ${(FP.sprite && FP.sprite.getStage) ? FP.sprite.getStage(currentPal.category) : ''}
                                    </div>
                                </div>

                                <div class="figpal-nav-overlay right">
                                    <button class="figpal-nav-btn" data-action="accessory-right"><span class="chevron right"></span></button>
                                    <button class="figpal-nav-btn" data-action="object-right"><span class="chevron right"></span></button>
                                </div>
                            </div>
                        </div>

                        <!-- Color Dots -->
                        <div class="figpal-color-dots">
                            <div class="color-dot" data-color-name="Red" data-color="#cc5d5d" style="background:#cc5d5d"></div>
                            <div class="color-dot" data-color-name="Orange" data-color="#e89f5d" style="background:#e89f5d"></div>
                            <div class="color-dot" data-color-name="Yellow" data-color="#f2db6d" style="background:#f2db6d"></div>
                            <div class="color-dot" data-color-name="Green" data-color="#a0c273" style="background:#a0c273"></div>
                            <div class="color-dot" data-color-name="Blue" data-color="#8eb7cc" style="background:#8eb7cc"></div>
                            <div class="color-dot" data-color-name="Purple" data-color="#ae8fcc" style="background:#ae8fcc"></div>
                            <div class="color-dot" data-color-name="Pink" data-color="#e58fcc" style="background:#e58fcc"></div>
                            <div class="color-dot selected" data-color-name="Gray" data-color="#949494" style="background:#949494"></div>
                            <div class="color-dot" data-color-name="Black" data-color="#3d3d3d" style="background:#3d3d3d"></div>
                        </div>

                        <!-- Textbox / Namer -->
                        <div class="figpal-namer-row">
                            <input type="text" class="figpal-namer-input" placeholder="Name your pal" value="FigBot" />
                        </div>
                    </div>

                    <div class="figpal-panel-sidebar">
                        <div class="figpal-sidebar-card">
                            <div class="figpal-setting-toggle">
                                <div class="figpal-switch active">
                                    <div class="figpal-switch-thumb">
                                        <!-- Stripes / Texture Placeholder -->
                                    </div>
                                </div>
                                <span class="figpal-label">Activate pals</span>
                            </div>
                            
                            <div class="figpal-divider"></div>
                            
                            <div class="figpal-surprise-action">
                                <button class="figpal-surprise-btn">
                                    ${getIconFileHTML('Surprise Me')}
                                </button>
                                <span class="figpal-label">Surprise me</span>
                            </div>

                            <a href="#" class="figpal-bts-link">Behind the scenes</a>
                        </div>
                        
                        <button class="figpal-main-save-btn">Save</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Tab Switching
        overlay.querySelectorAll('.figpal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                overlay.querySelectorAll('.figpal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentPal.category = tab.dataset.tab;
                // Reset to first subtype of category
                const types = subTypeRegistry[currentPal.category] || ["Rock"];
                currentPal.subType = types[0];
                renderPreview();
            });
        });

        // Navigation Arrows
        overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'object-left') cycleSubType(-1);
                if (action === 'object-right') cycleSubType(1);
                if (action === 'accessory-left') cycleAccessory(-1);
                if (action === 'accessory-right') cycleAccessory(1);
            });
        });

        // Color dot interactivity
        overlay.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                overlay.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
                dot.classList.add('selected');
                currentPal.color = dot.dataset.color;
                currentPal.colorName = dot.dataset.colorName;
                renderPreview();
            });
        });

        // Save Button logic
        overlay.querySelector('.figpal-main-save-btn').addEventListener('click', () => {
            console.log('FigPal: Saving active pal...', currentPal);
            FP.state.activePal = { ...currentPal };
            chrome.storage.local.set({ activePal: currentPal }, () => {
                if (FP.injector?.reRenderFollower) {
                    FP.injector.reRenderFollower();
                }
                const btn = overlay.querySelector('.figpal-main-save-btn');
                const oldText = btn.textContent;
                btn.textContent = 'Saved!';
                btn.classList.add('saved');
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.classList.remove('saved');
                }, 2000);
            });
        });

        // Prevent clicks inside the panel from closing the overlay
        overlay.querySelector('.figpal-panel-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close button listener
        overlay.querySelector('.figpal-panel-close-abs').addEventListener('click', (e) => {
            e.stopPropagation();
            toggle(false);
        });

        // Clicking backdrop closes it too
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) toggle(false);
        });

        FP.state.elements = FP.state.elements || {};
        FP.state.elements.panelOverlay = overlay;
    }

    function toggle(force) {
        const overlay = document.getElementById('figpal-panel-overlay');
        if (!overlay) return;

        const isVisible = (typeof force === 'boolean') ? force : !overlay.classList.contains('visible');

        if (isVisible) {
            overlay.classList.add('visible');
        } else {
            overlay.classList.remove('visible');
        }
    }

    // Export
    FP.panel = { init, toggle };
})();
