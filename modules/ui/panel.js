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
            "Animal": ["Capybara", "Bird", "Rodent", "Dog", "Cat", "Caterpillar", "Duck", "Frog", "Fish", "Pufferfish", "Snail", "Elephant", "Snake"],
            "Food": ["Pancake", "Coffee", "Onigiri", "Veggie", "Pizza", "Bao", "Bread", "Sushi", "Boba", "Fruit", "Coconut", "Egg"],
            "Figma": ["Heart", "Pencil", "Comment", "Library", "Overlap", "Union", "Pen", "Pointer", "Figma"],
            "Custom": ["Upload"]
        };

        const colorRegistry = [
            { name: "Red", hex: "#cc5d5d" },
            { name: "Orange", hex: "#e89f5d" },
            { name: "Yellow", hex: "#f2db6d" },
            { name: "Green", hex: "#a0c273" },
            { name: "Blue", hex: "#8eb7cc" },
            { name: "Purple", hex: "#ae8fcc" },
            { name: "Pink", hex: "#e58fcc" },
            { name: "Gray", hex: "#949494" },
            { name: "Black", hex: "#3d3d3d" }
        ];

        const accessoryRegistry = [
            "None", "Angry", "Antennae", "BeigeHat", "BlueHat", "Candle", "Excitement", "Flower",
            "GrayHat", "GreenBeanie", "Halo", "Heart", "Lightbulb", "PartyHat", "PinkBeanie",
            "PropellerHat", "Question", "RedBeanie", "Sparkle", "Sprout", "Sweat", "Thinking",
            "Tophat", "WitchHat", "WizardHat"
        ];

        // Custom config registry (per-subtype memory for accessories/positions)
        const customConfigs = {};
        const customSprites = {}; // Map of subType -> dataURL

        // Load saved state
        chrome.storage.local.get(['activePal', 'customConfigs', 'customSprites', 'customSubTypes'], (res) => {
            if (res.customConfigs) Object.assign(customConfigs, res.customConfigs);
            if (res.customSprites) Object.assign(customSprites, res.customSprites);
            if (res.customSubTypes) {
                // Filter out any hardcoded legacy names like ClawdBot
                subTypeRegistry["Custom"] = [...res.customSubTypes.filter(s => s !== "ClawdBot"), "Upload"];
            }

            if (res.activePal) {
                // If the active pal was the now-deleted ClawdBot, reset it
                if (res.activePal.subType === "ClawdBot") {
                    res.activePal.category = "Object";
                    res.activePal.subType = "Rock";
                }
                Object.assign(currentPal, res.activePal);
                FP.state.activePal = { ...currentPal };

                // Update Name Input
                const nameInput = overlay.querySelector('.figpal-namer-input');
                if (nameInput) nameInput.value = currentPal.name || "FigBot";

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
            const nextAcc = accessoryRegistry[idx];

            // Critical fix: update BOTH currentPal AND custom memory
            currentPal.accessory = nextAcc;

            if (currentPal.category === 'Custom' && currentPal.subType !== 'Upload') {
                const config = customConfigs[currentPal.subType] || { accessoryPosition: "Top" };
                config.accessory = nextAcc;
                customConfigs[currentPal.subType] = config;
            }

            renderPreview();
        };

        const surpriseMe = () => {
            // Random Category
            const categories = Object.keys(subTypeRegistry);
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            currentPal.category = randomCategory;

            // Random SubType
            const subTypes = subTypeRegistry[randomCategory];
            const randomSubType = subTypes[Math.floor(Math.random() * subTypes.length)];
            currentPal.subType = randomSubType;

            // Random Color
            const randomColorObj = colorRegistry[Math.floor(Math.random() * colorRegistry.length)];
            currentPal.colorName = randomColorObj.name;
            currentPal.color = randomColorObj.hex;

            // Accessory Logic
            if (currentPal.category === 'Custom') {
                // If shuffle picks Custom, don't use the standard randomAccessory
                // Just use what's already in the config or default to None
                const config = customConfigs[currentPal.subType] || {};
                currentPal.accessory = config.accessory || "None";
            } else {
                const randomAccessory = accessoryRegistry[Math.floor(Math.random() * accessoryRegistry.length)];
                currentPal.accessory = randomAccessory;
            }

            // Update UI
            overlay.querySelectorAll('.figpal-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === currentPal.category);
            });

            overlay.querySelectorAll('.color-dot').forEach(d => {
                d.classList.toggle('selected', d.dataset.colorName === currentPal.colorName);
            });

            renderPreview();

            const btn = overlay.querySelector('.figpal-surprise-btn');
            btn.classList.add('pulse');
            setTimeout(() => btn.classList.remove('pulse'), 300);
        };

        const rotateAccessoryPosition = () => {
            const positions = ["Top", "Right", "Bottom", "Left"];
            const config = customConfigs[currentPal.subType] || {
                accessory: currentPal.accessory || "None",
                accessoryPosition: "Top"
            };

            let currentIdx = positions.indexOf(config.accessoryPosition);
            if (currentIdx === -1) currentIdx = 0;

            const nextIdx = (currentIdx + 1) % positions.length;
            const nextPos = positions[nextIdx];

            customConfigs[currentPal.subType] = {
                accessory: config.accessory,
                accessoryPosition: nextPos
            };

            chrome.storage.local.set({ customConfigs });
            renderPreview();
        };

        const handleUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                const fileName = file.name.split('.')[0] || "MyBot";
                const baseName = fileName.replace(/\s+/g, '-');

                // Ensure unique name
                let finalName = baseName;
                let counter = 1;
                const existing = subTypeRegistry["Custom"];
                while (existing.includes(finalName)) {
                    finalName = `${baseName}-${counter++}`;
                }

                // Update Registries
                customSprites[finalName] = dataUrl;
                subTypeRegistry["Custom"].unshift(finalName); // Add to start

                // Persistence
                chrome.storage.local.set({
                    customSprites: customSprites,
                    customSubTypes: subTypeRegistry["Custom"].filter(s => s !== "Upload")
                });

                // Select the new bot
                currentPal.category = "Custom";
                currentPal.subType = finalName;
                renderPreview();
            };
            reader.readAsDataURL(file);
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
                const config = (currentPal.category === 'Custom') ? customConfigs[currentPal.subType] || {} : {};

                previewContainer.innerHTML = safeAssemble({
                    category: currentPal.category,
                    subType: currentPal.subType,
                    colorName: currentPal.colorName,
                    color: currentPal.color,
                    accessory: config.accessory || currentPal.accessory,
                    accessoryPosition: config.accessoryPosition || undefined,
                    parts: currentPal.parts,
                    customBodyUrl: customSprites[currentPal.subType] || null
                });
            }
            // Update stage platform
            const stageDisc = overlay.querySelector('.figpal-stage-disc');
            if (stageDisc && FP.sprite && FP.sprite.getStage) {
                stageDisc.innerHTML = FP.sprite.getStage(currentPal.category);
            }

            // Sync Tab Classes
            overlay.querySelectorAll('.figpal-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === currentPal.category);
            });

            // Toggle Interaction Row (Dots vs Delete)
            const dotsContainer = overlay.querySelector('.figpal-color-dots');
            const customActions = overlay.querySelector('.figpal-custom-actions');

            if (currentPal.category === 'Custom') {
                if (currentPal.subType === 'Upload') {
                    // Show special Upload placeholder
                    if (previewContainer) {
                        previewContainer.innerHTML = `
                            <div class="figpal-upload-placeholder" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;" id="trigger-upload">
                                <div style="width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                                    <span style="font-size:20px; color:rgba(0,0,0,0.4);">+</span>
                                </div>
                                <span style="color:rgba(0,0,0,0.4); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Add New</span>
                                <input type="file" id="figpal-file-input" style="display:none;" accept="image/*">
                            </div>
                        `;
                        // Re-wire the trigger since we just replaced innerHTML
                        const trigger = previewContainer.querySelector('#trigger-upload');
                        const input = previewContainer.querySelector('#figpal-file-input');
                        if (trigger && input) {
                            trigger.addEventListener('click', () => input.click());
                            input.addEventListener('change', handleUpload);
                        }
                    }
                    if (dotsContainer) dotsContainer.style.display = 'none';
                    if (customActions) customActions.style.display = 'none';

                    if (stageDisc) stageDisc.style.display = 'none';
                    // Hide ONLY accessory arrows, keep object/subtype arrows for navigation
                    overlay.querySelectorAll('.figpal-nav-btn[data-action^="accessory"]').forEach(btn => btn.style.display = 'none');
                    overlay.querySelectorAll('.figpal-nav-btn[data-action^="object"]').forEach(btn => btn.style.display = 'flex');
                } else {
                    if (dotsContainer) dotsContainer.style.display = 'none';
                    if (customActions) customActions.style.display = 'flex';

                    // Show stage and arrows for actual bots
                    if (stageDisc) stageDisc.style.display = 'block';
                    overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => btn.style.display = 'flex');
                }
            } else {
                if (dotsContainer) dotsContainer.style.display = 'flex';
                if (customActions) customActions.style.display = 'none';

                // Show stage and arrows for normal categories
                if (stageDisc) stageDisc.style.display = 'block';
                overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => btn.style.display = 'flex');
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
                        <div class="figpal-tab-bar">
                            <div class="figpal-tab ${currentPal.category === 'Animal' ? 'active' : ''}" data-tab="Animal">
                                ${getIconFileHTML('Animal')}
                            </div>
                            <div class="figpal-tab ${currentPal.category === 'Food' ? 'active' : ''}" data-tab="Food">
                                ${getIconFileHTML('Food')}
                            </div>
                            <div class="figpal-tab ${currentPal.category === 'Object' ? 'active' : ''}" data-tab="Object">
                                ${getIconFileHTML('Object')}
                            </div>
                            <div class="figpal-tab ${currentPal.category === 'Figma' ? 'active' : ''}" data-tab="Figma">
                                ${getIconFileHTML('Figma')}
                            </div>
                            <div class="figpal-tab ${currentPal.category === 'Custom' ? 'active' : ''}" data-tab="Custom">
                                ${getIconFileHTML('Custom avatar')}
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
                                <button class="figpal-acc-rotate-btn" id="figpal-accessory-rotate">
                                    Shuffle position
                                </button>
                                <button class="figpal-delete-btn" id="figpal-delete-custom">
                                    Delete
                                </button>
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
                                <div class="figpal-switch ${localStorage.getItem('figpal-enabled') === 'false' ? '' : 'active'}">
                                    <div class="figpal-switch-thumb">
                                        <!-- Stripes / Texture Placeholder -->
                                    </div>
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
                overlay.querySelectorAll('.figpal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentPal.category = tab.dataset.tab;

                // Toggle Interaction Row visibility
                const dotsContainer = overlay.querySelector('.figpal-color-dots');
                const customActions = overlay.querySelector('.figpal-custom-actions');

                if (currentPal.category === 'Custom') {
                    if (dotsContainer) dotsContainer.style.display = 'none';
                    if (customActions) customActions.style.display = 'block';
                } else {
                    if (dotsContainer) dotsContainer.style.display = 'flex';
                    if (customActions) customActions.style.display = 'none';
                }

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

        // Toggle switch logic
        overlay.querySelector('.figpal-switch').addEventListener('click', () => {
            const sw = overlay.querySelector('.figpal-switch');
            const isActive = sw.classList.toggle('active');
            localStorage.setItem('figpal-enabled', isActive ? 'true' : 'false');

            if (isActive) {
                document.body.classList.remove('figpal-disabled');
            } else {
                document.body.classList.add('figpal-disabled');
            }

            // Trigger injector update for toolbar buttons
            if (FP.injector && FP.injector.updateToolbarBtnState) {
                // Though updateToolbarBtnState is usually internal to injector, 
                // we can export it if needed or just let the MutationObserver in injector handle it.
            }
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

        // Name Input Logic
        const namerInput = overlay.querySelector('.figpal-namer-input');
        if (namerInput) {
            namerInput.addEventListener('input', (e) => {
                currentPal.name = e.target.value;
                if (window.FigPal && window.FigPal.emit) {
                    window.FigPal.emit('pal-name-changed', currentPal.name);
                }
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
                if (!subType || subType === 'Upload') return;

                console.log(`FigPal: Attempting to delete ${subType}`);
                if (confirm(`Remove ${subType} from your list?`)) {
                    const types = subTypeRegistry["Custom"];
                    const idx = types.indexOf(subType);

                    if (idx > -1) {
                        types.splice(idx, 1);
                        delete customSprites[subType];
                        delete customConfigs[subType];

                        // Persistence
                        chrome.storage.local.set({
                            customSprites: customSprites,
                            customSubTypes: types.filter(s => s !== "Upload"),
                            customConfigs: customConfigs
                        });

                        // Logic to pick next available or fallback
                        if (types.length === 0 || (types.length === 1 && types[0] === "Upload")) {
                            currentPal.category = "Object";
                            currentPal.subType = "Rock";
                        } else {
                            currentPal.subType = types[0] === "Upload" ? types[1] : types[0];
                        }

                        renderPreview();

                        // Force re-render of follower
                        if (FP.injector && FP.injector.reRenderFollower) {
                            FP.injector.reRenderFollower();
                        }
                    }
                }
            });
        }

        // Accessory Rotate Button Logic
        const accRotateBtn = overlay.querySelector('#figpal-accessory-rotate');
        if (accRotateBtn) {
            accRotateBtn.addEventListener('click', rotateAccessoryPosition);
        }

        // Save Button logic - Now using component wiring
        const saveBtn = overlay.querySelector('.figpal-main-save-btn');
        FP.components.Button.wire(saveBtn, currentPal, () => {
            // Close panel after saving
            toggle(false);
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
