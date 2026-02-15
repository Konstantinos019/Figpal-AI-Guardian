// modules/ui/panel.js
// Figpal Panel Hub: Entry point for Sprite Creator and Legacy Controls.
(function () {
    'use strict';

    const FP = window.FigPal;

    let currentPal = {
        category: "Object",
        subType: "Rock",
        colorName: "Gray",
        color: "#949494",
        name: "",
        accessory: "None",
        parts: ["body"],
        isEnabled: true // Tracked for transactional save
    };

    let snapshot = null;

    const subTypeRegistry = {
        "Object": ["Rock", "Cloud", "Star", "Mushroom", "Flower", "Bus", "Poo", "Ball", "Rainbow"],
        "Animal": ["Capybara", "Bird", "Rodent", "Dog", "Cat", "Caterpillar", "Duck", "Frog", "Fish", "Pufferfish", "Snail", "Elephant", "Snake"],
        "Food": ["Pancake", "Coffee", "Onigiri", "Veggie", "Pizza", "Bao", "Bread", "Sushi", "Boba", "Fruit", "Coconut", "Egg"],
        "Figma": ["Heart", "Pencil", "Comment", "Library", "Overlap", "Union", "Pen", "Pointer", "Figma"],
        "Custom": ["Upload"]
    };

    const colorRegistry = [
        { name: "Red", hex: "#cc5d5d", bg: "#e8acab" },
        { name: "Orange", hex: "#e89f5d", bg: "#f8cead" },
        { name: "Yellow", hex: "#f2db6d", bg: "#f6ebb9" },
        { name: "Green", hex: "#a0c273", bg: "#cbd6b2" },
        { name: "Blue", hex: "#8eb7cc", bg: "#c5dbe6" },
        { name: "Purple", hex: "#ae8fcc", bg: "#dac0ea" },
        { name: "Pink", hex: "#e58fcc", bg: "#edbbe1" },
        { name: "Gray", hex: "#949494", bg: "#ccc" },
        { name: "Black", hex: "#3d3d3d", bg: "#9f9f9f" }
    ];

    const accessoryRegistry = [
        "None", "Angry", "Antennae", "BeigeHat", "BlueHat", "Candle", "Excitement", "Flower",
        "GrayHat", "GreenBeanie", "Halo", "Heart", "Lightbulb", "PartyHat", "PinkBeanie",
        "PropellerHat", "Question", "RedBeanie", "Sparkle", "Sprout", "Sweat", "Thinking",
        "Tophat", "WitchHat", "WizardHat"
    ];

    let overlay = null;

    const safeIcon = (name, color) => (FP.sprite && FP.sprite.getIcon) ? FP.sprite.getIcon(name, color) : '';
    const safeAssemble = (opts) => (FP.sprite && FP.sprite.assemble) ? FP.sprite.assemble(opts) : '';

    const getIconFileHTML = (name) => {
        const url = chrome.runtime.getURL(`assets/Icons/${name}.svg`);
        return `<div class="figpal-icon-mask" style="-webkit-mask-image: url('${url}'); mask-image: url('${url}');"></div>`;
    };

    const renderPreview = () => {
        if (!overlay) return;
        const previewContainer = overlay.querySelector('.figpal-pal-layers');
        const custom = FP.state.custom;
        const stageDisc = overlay.querySelector('.figpal-stage-disc');
        const dotsContainer = overlay.querySelector('.figpal-color-dots');
        const customActions = overlay.querySelector('.figpal-custom-actions');

        if (previewContainer) {
            if (currentPal.category === 'Custom' && currentPal.subType === 'Upload') {
                // Show special Upload placeholder
                previewContainer.innerHTML = `
                    <div class="figpal-upload-placeholder" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;" id="trigger-upload">
                        <div style="width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                            <span style="font-size:20px; color:rgba(0,0,0,0.4);">+</span>
                        </div>
                        <span style="color:rgba(0,0,0,0.4); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Add New</span>
                        <input type="file" id="figpal-file-input" style="display:none;" accept="image/*">
                    </div>
                `;
                // Wire the trigger
                const trigger = previewContainer.querySelector('#trigger-upload');
                const input = previewContainer.querySelector('#figpal-file-input');
                if (trigger && input) {
                    trigger.addEventListener('click', () => input.click());
                    input.addEventListener('change', handleUpload);
                }

                // Hide dots and custom actions for Upload placeholder
                if (dotsContainer) dotsContainer.style.display = 'none';
                if (customActions) customActions.style.display = 'none';
                if (stageDisc) stageDisc.style.display = 'none';

                // Hide accessory arrows, keep navigation arrows
                overlay.querySelectorAll('.figpal-nav-btn[data-action^="accessory"]').forEach(btn => btn.style.display = 'none');
                overlay.querySelectorAll('.figpal-nav-btn[data-action^="object"]').forEach(btn => btn.style.display = 'flex');
            } else {
                const config = (currentPal.category === 'Custom') ? (custom.configs[currentPal.subType] || {}) : {};

                previewContainer.innerHTML = safeAssemble({
                    category: currentPal.category,
                    subType: currentPal.subType,
                    colorName: currentPal.colorName,
                    color: currentPal.color,
                    accessory: currentPal.accessory,
                    accessoryPosition: (currentPal.category === 'Custom' && config.accessoryPosition) ? config.accessoryPosition : undefined,
                    parts: currentPal.parts,
                    customBodyUrl: (custom.sprites && custom.sprites[currentPal.subType]) || null
                });

                // Show dots or custom actions
                if (currentPal.category === 'Custom') {
                    if (dotsContainer) dotsContainer.style.display = 'none';
                    if (customActions) customActions.style.display = 'flex';
                } else {
                    if (dotsContainer) dotsContainer.style.display = 'flex';
                    if (customActions) customActions.style.display = 'none';
                }

                // Show stage and all arrows
                if (stageDisc) stageDisc.style.display = 'block';
                overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => btn.style.display = 'flex');

                // Trigger follower update with working copy for live preview (DO NOT update global activePal yet)
                if (FP.injector?.reRenderFollower) {
                    FP.injector.reRenderFollower(currentPal);
                }
            }
        }

        // Update stage platform (generic update)
        if (stageDisc && FP.sprite && FP.sprite.getStage && currentPal.subType !== 'Upload') {
            stageDisc.innerHTML = FP.sprite.getStage(currentPal.category);
        }

        // Sync Tab Classes
        overlay.querySelectorAll('.figpal-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === currentPal.category);
        });

        // Active Color Sync
        overlay.querySelectorAll('.color-dot').forEach(dot => {
            dot.classList.toggle('selected', dot.dataset.colorName === currentPal.colorName);
        });

        // Sync Switch UI (Preview only)
        const sw = overlay.querySelector('.figpal-switch');
        if (sw) {
            sw.classList.toggle('active', currentPal.isEnabled);
            if (currentPal.isEnabled) {
                document.body.classList.remove('figpal-disabled');
            } else {
                document.body.classList.add('figpal-disabled');
            }
        }

        // Update Background Color
        const stageArea = overlay.querySelector('.figpal-stage-area');
        if (stageArea) {
            if (currentPal.category === 'Custom') {
                stageArea.style.backgroundColor = '#ccc'; // Keep gray for custom upload/config
            } else {
                const colorObj = colorRegistry.find(c => c.name === currentPal.colorName);
                if (colorObj && colorObj.bg) {
                    stageArea.style.backgroundColor = colorObj.bg;
                } else {
                    stageArea.style.backgroundColor = ''; // Reset to default CSS
                }
            }
        }
    };

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

    const rotateAccessoryPosition = () => {
        const custom = FP.state.custom;
        const positions = ["Top", "Right", "Bottom", "Left"];
        const config = custom.configs[currentPal.subType] || {
            accessory: currentPal.accessory || "None",
            accessoryPosition: "Top"
        };

        let currentIdx = positions.indexOf(config.accessoryPosition);
        if (currentIdx === -1) currentIdx = 0;

        const nextIdx = (currentIdx + 1) % positions.length;
        const nextPos = positions[nextIdx];

        custom.configs[currentPal.subType] = {
            ...config,
            accessoryPosition: nextPos
        };

        // Note: customConfigs are currently saved real-time to memory/storage, 
        // but this only affects the layout configuration of custom bots.
        chrome.storage.local.set({ customConfigs: custom.configs });
        renderPreview();
    };

    const surpriseMe = () => {
        if (!overlay) return;
        const availableCategories = Object.keys(subTypeRegistry).filter(cat => {
            if (cat === 'Custom') {
                return subTypeRegistry[cat].filter(s => s !== 'Upload').length > 0;
            }
            return true;
        });

        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        currentPal.category = randomCategory;

        let subTypes = subTypeRegistry[randomCategory];
        if (randomCategory === 'Custom') {
            subTypes = subTypes.filter(s => s !== "Upload");
        }
        currentPal.subType = subTypes[Math.floor(Math.random() * subTypes.length)];

        const randomColorObj = colorRegistry[Math.floor(Math.random() * colorRegistry.length)];
        currentPal.colorName = randomColorObj.name;
        currentPal.color = randomColorObj.hex;

        currentPal.accessory = accessoryRegistry[Math.floor(Math.random() * accessoryRegistry.length)];

        renderPreview();

        const btn = overlay.querySelector('.figpal-surprise-btn');
        if (btn) {
            btn.classList.add('pulse');
            setTimeout(() => btn.classList.remove('pulse'), 300);
        }
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const fileName = file.name.split('.')[0] || "MyBot";
            const baseName = fileName.replace(/\s+/g, '-');

            let finalName = baseName;
            let counter = 1;
            const existing = subTypeRegistry["Custom"];
            while (existing.includes(finalName)) {
                finalName = `${baseName}-${counter++}`;
            }

            const custom = FP.state.custom;
            custom.sprites[finalName] = dataUrl;
            subTypeRegistry["Custom"].unshift(finalName);
            custom.subTypes = subTypeRegistry["Custom"].filter(s => s !== "Upload");

            chrome.storage.local.set({
                customSprites: custom.sprites,
                customSubTypes: custom.subTypes
            });

            currentPal.category = "Custom";
            currentPal.subType = finalName;
            renderPreview();
        };
        reader.readAsDataURL(file);
    };

    function init() {
        console.log('FigPal: Panel init called');
        if (document.getElementById('figpal-panel-overlay')) {
            console.log('FigPal: Panel overlay already exists');
            return;
        }

        overlay = document.createElement('div');
        overlay.id = 'figpal-panel-overlay';
        overlay.className = 'figpal-panel-overlay';

        // Shared state namespace links
        const custom = FP.state.custom;

        // Load saved state from shared namespace (already fetched in injector.js)
        subTypeRegistry["Custom"] = [...custom.subTypes.filter(s => s !== "ClawdBot"), "Upload"];

        // Initialize isEnabled from localStorage
        currentPal.isEnabled = localStorage.getItem('figpal-enabled') !== 'false';

        chrome.storage.local.get(['activePal'], (res) => {
            if (res.activePal) {
                // If the active pal was the now-deleted ClawdBot, reset it
                if (res.activePal.subType === "ClawdBot" || (res.activePal.category === "Custom" && !subTypeRegistry["Custom"].includes(res.activePal.subType))) {
                    console.log("FigPal: Found invalid or deleted subtype, resetting to Rock");
                    res.activePal.category = "Object";
                    res.activePal.subType = "Rock";
                    res.activePal.color = "#949494";
                    res.activePal.colorName = "Gray";
                    chrome.storage.local.set({ activePal: res.activePal });
                }
                Object.assign(currentPal, res.activePal);
                // Ensure isEnabled is also synced if it was missing from storage
                if (typeof currentPal.isEnabled === 'undefined') currentPal.isEnabled = true;

                FP.state.activePal = { ...currentPal };

                // Update Name Input
                const nameInput = overlay.querySelector('.figpal-namer-input');
                if (nameInput) nameInput.value = currentPal.name || "FigBot";

                renderPreview();
                if (FP.injector?.reRenderFollower) FP.injector.reRenderFollower();
            }
        });

        overlay.innerHTML = `
            <div id="figpal-panel-hub" class="figpal-panel-container">
                <div class="figpal-panel-header">
                    <span class="figpal-header-title">Customize your FigPal</span>
                    <button class="figpal-panel-close-abs">×</button>
                </div>
                
                <div class="figpal-panel-content">
                    <div class="figpal-panel-main">
                        <div class="figpal-tab-bar">
                            <div class="figpal-tab Animal" data-tab="Animal">${getIconFileHTML('Animal')}</div>
                            <div class="figpal-tab Food" data-tab="Food">${getIconFileHTML('Food')}</div>
                            <div class="figpal-tab Object" data-tab="Object">${getIconFileHTML('Object')}</div>
                            <div class="figpal-tab Figma" data-tab="Figma">${getIconFileHTML('Figma')}</div>
                            <div class="figpal-tab Custom" data-tab="Custom">${getIconFileHTML('Custom avatar')}</div>
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

                        <!-- Color Dots / Custom Actions -->
                        <div class="figpal-interaction-row" style="width: 100%; min-height: 24px;">
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
                            <div class="figpal-custom-actions" style="display:none;">
                                <button class="figpal-acc-rotate-btn" id="figpal-accessory-rotate">Shuffle position</button>
                                <button class="figpal-delete-btn" id="figpal-delete-custom">Delete</button>
                            </div>
                        </div>

                        <!-- Textbox / Namer -->
                        <div class="figpal-namer-row">
                            <input type="text" class="figpal-namer-input" placeholder="Name your pal" value="FigBot" maxlength="18" />
                        </div>
                    </div>

                    <div class="figpal-panel-sidebar">
                        <div class="figpal-sidebar-card">
                            <div class="figpal-setting-toggle">
                                <div class="figpal-switch ${currentPal.isEnabled ? 'active' : ''}">
                                    <div class="figpal-switch-thumb"></div>
                                </div>
                                <span class="figpal-label">Activate pals</span>
                            </div>
                            <div class="figpal-divider"></div>
                            <div class="figpal-surprise-action">
                                <button class="figpal-surprise-btn" id="figpal-surprise-trigger">
                                    ${getIconFileHTML('Surprise Me')}
                                </button>
                                <span class="figpal-label">Surprise me</span>
                            </div>
                            <a href="#" class="figpal-bts-link">Behind the scenes</a>
                        </div>
                        ${FP.components.Button.render()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Tab Switching
        overlay.querySelectorAll('.figpal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                currentPal.category = tab.dataset.tab;
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

        // Toggle switch logic (Transactional)
        overlay.querySelector('.figpal-switch').addEventListener('click', () => {
            currentPal.isEnabled = !currentPal.isEnabled;
            renderPreview(); // Real-time UI update, but not persistent yet
        });

        // Color dot interactivity
        overlay.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                currentPal.color = dot.dataset.color;
                currentPal.colorName = dot.dataset.colorName;
                renderPreview();
            });
        });

        // Name Input Logic
        const nameInput = overlay.querySelector('.figpal-namer-input');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => e.stopPropagation());
            nameInput.addEventListener('paste', (e) => e.stopPropagation());
            nameInput.addEventListener('contextmenu', (e) => e.stopPropagation());

            nameInput.addEventListener('input', (e) => {
                currentPal.name = e.target.value;
                // Preview name change on signpost/header
                if (window.FigPal && window.FigPal.emit) {
                    window.FigPal.emit('pal-name-changed', currentPal.name);
                }
                renderPreview();
            });
        }

        // Surprise Me Button Logic
        const surpriseBtn = overlay.querySelector('#figpal-surprise-trigger');
        if (surpriseBtn) {
            surpriseBtn.addEventListener('click', surpriseMe);
        }

        // Delete Custom Button Logic
        const deleteBtn = overlay.querySelector('#figpal-delete-custom');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const subType = currentPal.subType;
                if (!subType || subType === 'Upload' || currentPal.category !== 'Custom') return;

                const types = subTypeRegistry["Custom"];
                const idx = types.indexOf(subType);
                if (idx > -1) {
                    types.splice(idx, 1);
                    delete custom.sprites[subType];
                    delete custom.configs[subType];
                    custom.subTypes = types.filter(s => s !== "Upload");

                    chrome.storage.local.set({
                        customSprites: custom.sprites,
                        customSubTypes: custom.subTypes,
                        customConfigs: custom.configs
                    });

                    if (types.length <= 1) {
                        currentPal.category = "Object";
                        currentPal.subType = "Rock";
                    } else {
                        currentPal.subType = types[0] === "Upload" ? types[1] : types[0];
                    }

                    FP.state.activePal = { ...currentPal };
                    renderPreview();
                    if (FP.injector?.reRenderFollower) FP.injector.reRenderFollower();
                }
            });
        }

        // Accessory Rotate Button Logic
        const accRotateBtn = overlay.querySelector('#figpal-accessory-rotate');
        if (accRotateBtn) {
            accRotateBtn.addEventListener('click', rotateAccessoryPosition);
        }

        // Save Button logic
        const saveBtn = overlay.querySelector('.figpal-main-save-btn');
        FP.components.Button.wire(saveBtn, currentPal, () => {
            // Persistent commit of non-character state
            localStorage.setItem('figpal-enabled', currentPal.isEnabled ? 'true' : 'false');
            toggle(false, true);
        });

        // Stop propagation inside panel
        overlay.querySelector('.figpal-panel-container').addEventListener('click', (e) => e.stopPropagation());

        // Close button and Backdrop
        overlay.querySelector('.figpal-panel-close-abs').addEventListener('click', () => toggle(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) toggle(false);
        });

        FP.state.elements = FP.state.elements || {};
        FP.state.elements.panelOverlay = overlay;
    }

    function toggle(force, isSave = false) {
        const overlay = document.getElementById('figpal-panel-overlay');
        if (!overlay) return;

        const isVisible = (typeof force === 'boolean') ? force : !overlay.classList.contains('visible');

        if (isVisible) {
            console.log('FigPal Panel: Opening. Capturing snapshot...');
            // Capture both character state (activePal) and global settings (isEnabled)
            snapshot = JSON.parse(JSON.stringify(FP.state.activePal || currentPal));
            snapshot.isEnabled = localStorage.getItem('figpal-enabled') !== 'false';

            Object.assign(currentPal, snapshot);

            const nameInput = overlay.querySelector('.figpal-namer-input');
            if (nameInput) nameInput.value = currentPal.name || "";

            renderPreview();
            overlay.classList.add('visible');
        } else {
            console.log(`FigPal Panel: Closing (isSave=${isSave})`);
            if (!isSave && snapshot) {
                console.log('FigPal Panel: Reverting changes...');
                FP.state.activePal = snapshot;
                currentPal.isEnabled = snapshot.isEnabled;

                // Revert UI classes for disabled state
                if (currentPal.isEnabled) {
                    document.body.classList.remove('figpal-disabled');
                } else {
                    document.body.classList.add('figpal-disabled');
                }

                if (FP.injector?.reRenderFollower) FP.injector.reRenderFollower();
                if (FP.emit) FP.emit('pal-name-changed', snapshot.name);
            }
            overlay.classList.remove('visible');
            snapshot = null;
        }
    }

    // Export
    FP.panel = { init, toggle };
})();
