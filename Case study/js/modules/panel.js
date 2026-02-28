// js/modules/panel.js
// Figpal Panel Hub: Entry point for Sprite Creator and Legacy Controls.
(function () {
    'use strict';

    const FP = window.FigPal;

    let currentPal = {
        category: "Animal",
        subType: "Cat",
        colorName: "Pink",
        color: "#e58fcc",
        name: "",
        accessory: "Heart",
        parts: ["body"],
        isEnabled: true // Always true now
    };

    let snapshot = null;

    const subTypeRegistry = {
        "Object": ["Rock", "Cloud", "Star", "Mushroom", "Flower", "Bus", "Poo", "Ball", "Rainbow"],
        "Animal": ["Capybara", "Bird", "Rodent", "Dog", "Cat", "Caterpillar", "Duck", "Frog", "Fish", "Pufferfish", "Snail", "Elephant", "Snake"],
        "Food": ["Pancake", "Coffee", "Onigiri", "Veggie", "Pizza", "Bao", "Bread", "Sushi", "Boba", "Fruit", "Coconut", "Egg"],
        "Figma": ["Heart", "Pencil", "Comment", "Library", "Overlap", "Union", "Pen", "Pointer", "Figma"]
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

    const safeAssemble = (opts) => (FP.sprite && FP.sprite.assemble) ? FP.sprite.assemble(opts) : '';

    const getIconFileHTML = (name) => {
        const url = `media/Icons/${encodeURIComponent(name)}.svg`;
        return `<div class="figpal-icon-container"><img src="${url}" alt="${name}" /></div>`;
    };

    const renderPreview = () => {
        if (!overlay) return;
        const previewContainer = overlay.querySelector('.figpal-pal-layers');
        const stageDisc = overlay.querySelector('.figpal-stage-disc');
        const dotsContainer = overlay.querySelector('.figpal-color-dots');

        if (previewContainer) {
            previewContainer.innerHTML = safeAssemble({
                category: currentPal.category,
                subType: currentPal.subType,
                colorName: currentPal.colorName,
                color: currentPal.color,
                accessory: currentPal.accessory,
                parts: currentPal.parts
            });

            if (dotsContainer) dotsContainer.style.display = 'flex';
            if (stageDisc) stageDisc.style.display = 'block';
            overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => btn.style.display = 'flex');

            if (FP.emit) {
                FP.emit('sprite-update', currentPal);
            }
        }

        if (stageDisc && FP.sprite && FP.sprite.getStage) {
            stageDisc.innerHTML = FP.sprite.getStage(currentPal.category);
        }

        overlay.querySelectorAll('.figpal-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === currentPal.category);
        });

        overlay.querySelectorAll('.color-dot').forEach(dot => {
            dot.classList.toggle('selected', dot.dataset.colorName === currentPal.colorName);
        });

        const stageArea = overlay.querySelector('.figpal-stage-area');
        if (stageArea) {
            const colorObj = colorRegistry.find(c => c.name === currentPal.colorName);
            if (colorObj && colorObj.bg) {
                stageArea.style.backgroundColor = colorObj.bg;
            } else {
                stageArea.style.backgroundColor = '';
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

    const surpriseMe = () => {
        if (!overlay) return;
        const availableCategories = Object.keys(subTypeRegistry);

        const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        currentPal.category = randomCategory;

        let subTypes = subTypeRegistry[randomCategory];
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

    function init() {
        overlay = document.getElementById('figpal-panel-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'figpal-panel-overlay';
            overlay.className = 'figpal-panel-overlay';
            document.body.appendChild(overlay);
        }

        currentPal.isEnabled = true;
        const savedPal = localStorage.getItem('figpal-active-pal');
        if (savedPal) {
            Object.assign(currentPal, JSON.parse(savedPal));
        }

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
                        </div>

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

                        <div class="figpal-interaction-row">
                            <div class="figpal-color-dots">
                                ${colorRegistry.map(c => `<div class="color-dot" data-color-name="${c.name}" data-color="${c.hex}" style="background:${c.hex}"></div>`).join('')}
                            </div>
                        </div>

                        <div class="figpal-namer-row">
                            <input type="text" class="figpal-namer-input" placeholder="Name your pal" maxlength="18" />
                        </div>
                    </div>

                    <div class="figpal-panel-sidebar">
                        <div class="figpal-sidebar-card">
                            <div class="figpal-surprise-action">
                                <button class="figpal-surprise-btn" id="figpal-surprise-trigger">
                                    ${getIconFileHTML('Surprise Me')}
                                </button>
                                <span class="figpal-label">Surprise me</span>
                            </div>
                            <div class="figpal-divider"></div>
                            <a href="#" class="figpal-bts-link">Behind the scenes</a>
                        </div>
                        <button class="figpal-main-save-btn">Save changes</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('.figpal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                currentPal.category = tab.dataset.tab;
                const types = subTypeRegistry[currentPal.category] || ["Rock"];
                currentPal.subType = types[0];
                renderPreview();
            });
        });

        overlay.querySelectorAll('.figpal-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'object-left') cycleSubType(-1);
                if (action === 'object-right') cycleSubType(1);
                if (action === 'accessory-left') cycleAccessory(-1);
                if (action === 'accessory-right') cycleAccessory(1);
            });
        });

        overlay.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                currentPal.color = dot.dataset.color;
                currentPal.colorName = dot.dataset.colorName;
                renderPreview();
            });
        });

        const nameInput = overlay.querySelector('.figpal-namer-input');
        if (nameInput) {
            nameInput.value = currentPal.name || "";
            nameInput.addEventListener('input', (e) => {
                currentPal.name = e.target.value;
                if (FP.emit) FP.emit('pal-name-changed', currentPal.name);
                if (FP.emit) FP.emit('sprite-update', currentPal);
            });
        }

        overlay.querySelector('#figpal-surprise-trigger').addEventListener('click', surpriseMe);

        const saveBtn = overlay.querySelector('.figpal-main-save-btn');
        saveBtn.addEventListener('click', () => {
            localStorage.setItem('figpal-enabled', 'true');
            localStorage.setItem('figpal-active-pal', JSON.stringify(currentPal));
            FP.state.activePal = JSON.parse(JSON.stringify(currentPal));
            if (FP.emit) FP.emit('sprite-update', currentPal);
            if (FP.emit) FP.emit('pal-name-changed', currentPal.name);
            toggle(false, true);
        });

        overlay.querySelector('.figpal-panel-close-abs').addEventListener('click', () => toggle(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) toggle(false);
        });

        renderPreview();
    }

    function toggle(force, isSave = false) {
        const overlay = document.getElementById('figpal-panel-overlay');
        if (!overlay) return;

        const isVisible = (typeof force === 'boolean') ? force : !overlay.classList.contains('visible');

        if (isVisible) {
            snapshot = JSON.parse(JSON.stringify(FP.state.activePal || currentPal));
            snapshot.isEnabled = true;
            Object.assign(currentPal, snapshot);
            renderPreview();
            overlay.classList.add('visible');
        } else {
            if (!isSave && snapshot) {
                FP.state.activePal = snapshot;
                currentPal.isEnabled = true;
                if (FP.emit) FP.emit('sprite-update', snapshot);
                if (FP.emit) FP.emit('pal-name-changed', snapshot.name);
            }
            overlay.classList.remove('visible');
            snapshot = null;
        }
    }

    FP.panel = { init, toggle };
})();
