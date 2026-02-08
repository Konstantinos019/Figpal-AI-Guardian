(function () {
  let isInjected = false;

  function initFigPal() {
    // Continuous polling to handle SPA navigation and wait for specific Figma UI
    setInterval(() => {
      // 1. Check URL - matches /design/, /file/, or /proto/
      const isFigmaFile = /figma\.com\/(design|file|proto)\//.test(window.location.href);

      // Keep track of the current file key for the REST API
      window.figpalFileKey = null;
      window.figpalSelectedNodeId = null;

      if (!isFigmaFile) {
        return;
      }

      const urlMatch = window.location.href.match(/\/design\/([^\/]+)/) ||
        window.location.href.match(/\/file\/([^\/]+)/);
      if (urlMatch) {
        window.figpalFileKey = urlMatch[1];
      }

      const nodeMatch = window.location.href.match(/[?&]node-id=([^&]+)/);
      if (nodeMatch) {
        const rawId = decodeURIComponent(nodeMatch[1]);
        // Figma IDs usually use colon '1:2', but sometimes URL has '1-2'
        window.figpalSelectedNodeId = rawId.replace('-', ':');
      }

      // Debugging Selection State
      if (window.figpalSelectedNodeId && window.figpalSelectedNodeId !== window.lastLoggedNodeId) {
        console.log('DS Guardian: Selection updated to', window.figpalSelectedNodeId);
        window.lastLoggedNodeId = window.figpalSelectedNodeId;
      }

      // 2. Safeguard: Check if already injected
      if (document.getElementById('figpal-container')) {
        isInjected = true;
        return;
      }

      // 3. Robust Element Detection
      // We look for the main toolbelt or the objects panel which are the heart of the editor
      const targetElement = document.querySelector('[data-testid="design-toolbelt-wrapper"]') ||
        document.querySelector('[data-testid="objects-panel"]');

      if (targetElement && !isInjected) {
        console.log('DS Guardian: Editor detected via', targetElement.getAttribute('data-testid'));
        inject();
      }
    }, 1000);

    function inject() {
      if (document.getElementById('figpal-container')) return;
      console.log('DS Guardian: Injecting...');
      isInjected = true;

      // Create the container `div`
      const container = document.createElement('div');
      container.id = 'figpal-container';

      const defaultSprite = chrome.runtime.getURL('assets/selection.svg');
      const thinkingSprite = chrome.runtime.getURL('assets/thinking.svg');
      const homeSprite = chrome.runtime.getURL('assets/home.svg');

      // Create the home element (signpost)
      const home = document.createElement('img');
      home.id = 'figpal-home';
      home.src = homeSprite;

      // Create the follower element (character)
      const follower = document.createElement('img');
      follower.id = 'figpal-follower';
      follower.src = defaultSprite;
      follower.onerror = () => console.error('DS Guardian Error: Could not load image from', follower.src);

      // Create the chat bubble
      const chatBubble = document.createElement('div');
      chatBubble.id = 'figpal-chat-bubble';
      chatBubble.innerHTML = `
        <div class="figpal-chat-header">
          <span>DS Guardian</span>
          <select id="figpal-model-selector" title="Change AI Model"></select>
          <button class="figpal-close-btn" aria-label="Close chat">×</button>
        </div>
        <div class="figpal-chat-content">
          <!-- Messages will be injected here -->
        </div>
        <div class="figpal-chat-input-area">
          <input type="text" placeholder="Ask me anything..." />
          <button id="figpal-send-btn" title="Send message">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 9L9 5L1 1V9Z" fill="white"/>
            </svg>
          </button>
          <button id="figpal-stop-btn" title="Stop generating" style="display: none;">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="10" height="10" rx="2" fill="white"/>
            </svg>
          </button>
        </div>
        <div class="figpal-resizer top"></div>
        <div class="figpal-resizer top-left"></div>
        <div class="figpal-resizer top-right"></div>
        <div class="figpal-resizer left"></div>
        <div class="figpal-resizer right"></div>
        <div class="figpal-resizer bottom-left"></div>
        <div class="figpal-resizer bottom-right"></div>
      `;

      // Assemble
      document.body.appendChild(container);
      document.body.appendChild(home); // Signpost follows container for CSS sibling selector

      container.appendChild(follower);
      container.appendChild(chatBubble);

      // Initialization & UI Logic
      const closeBtn = chatBubble.querySelector('.figpal-close-btn');
      const modelSelector = chatBubble.querySelector('#figpal-model-selector');
      // No global chatInput declaration here to avoid conflicts

      const defaultModels = ['gemini-3-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro'];

      function populateModels(models) {
        if (!modelSelector) return;
        modelSelector.innerHTML = '';
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          modelSelector.appendChild(opt);
        });
      }

      // Load saved model or default
      chrome.storage.local.get(['selectedModel', 'availableModels'], (res) => {
        let models = res.availableModels;
        if (!models || models.length === 0) {
          models = defaultModels;
        }

        populateModels(models);

        if (modelSelector) {
          if (res.selectedModel && models.includes(res.selectedModel)) {
            modelSelector.value = res.selectedModel;
          } else {
            // Default to gemini-pro if available, else first one
            if (models.includes('gemini-pro')) modelSelector.value = 'gemini-pro';
            else modelSelector.value = models[0];
          }
        }
      });

      if (modelSelector) {
        modelSelector.addEventListener('change', (e) => {
          chrome.storage.local.set({ selectedModel: e.target.value });
        });
      }

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.remove('chat-visible');
      });

      // Stop/Send Button Logic
      let currentController = null;
      let chatHistory = []; // Conversation history
      const stopBtn = chatBubble.querySelector('#figpal-stop-btn');
      const sendBtn = chatBubble.querySelector('#figpal-send-btn');
      const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');

      function toggleInputState(isThinking) {
        if (isThinking) {
          sendBtn.style.display = 'none';
          stopBtn.style.display = 'flex';
        } else {
          stopBtn.style.display = 'none';
          sendBtn.style.display = 'flex';
          // Focus input when back to idle
          setTimeout(() => chatInput?.focus(), 50);
        }
      }

      stopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentController) {
          currentController.abort();
          currentController = null;

          toggleInputState(false); // Back to Send

          const thinkingMsg = chatBubble.querySelector('.figpal-message.thinking');
          if (thinkingMsg) {
            thinkingMsg.textContent = 'Stopped by user.';
            thinkingMsg.classList.remove('thinking');
            thinkingMsg.classList.add('figpal-error');
          }
          follower.src = defaultSprite;
          follower.classList.remove('thinking');
          const avatars = chatBubble.querySelectorAll('.figpal-avatar');
          if (avatars.length > 0) {
            avatars[avatars.length - 1].src = defaultSprite;
          }
        }
      });

      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (chatInput && chatInput.value.trim() !== '') {
          const text = chatInput.value.trim();
          chatInput.value = '';
          handleUserMessage(text);
        }
      });

      function showSetupPrompt() {
        const contentArea = chatBubble.querySelector('.figpal-chat-content');
        contentArea.innerHTML = `
          <div class="figpal-message-row bot">
            <img src="${defaultSprite}" class="figpal-avatar" />
            <div class="figpal-message bot">
              Welcome! To get started, I need your API keys. They'll be stored securely in your browser.
            </div>
          </div>
          <div class="figpal-setup-box">
            <div class="figpal-setup-item">
              <label>Gemini API Key</label>
              <input type="password" id="setup-gemini-key" placeholder="Paste Gemini key..." />
            </div>
            <div class="figpal-setup-item">
              <label>Figma Access Token (PAT)</label>
              <input type="password" id="setup-figma-pat" placeholder="Paste Figma PAT..." />
            </div>
            <button id="save-keys-btn">Initialize FigPal</button>
          </div>
        `;

        const inputs = contentArea.querySelectorAll('input');
        inputs.forEach(input => {
          input.addEventListener('keydown', (e) => e.stopPropagation());
          input.addEventListener('paste', (e) => e.stopPropagation());
          input.addEventListener('contextmenu', (e) => e.stopPropagation());
        });

        const firstInput = document.getElementById('setup-gemini-key');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);

        document.getElementById('save-keys-btn').addEventListener('click', () => {
          const geminiKey = document.getElementById('setup-gemini-key').value.trim();
          const figmaPat = document.getElementById('setup-figma-pat').value.trim();
          if (geminiKey && figmaPat) {
            chrome.storage.local.set({ geminiApiKey: geminiKey, figmaPat: figmaPat }, () => {
              showWelcomeMessage();
            });
          } else {
            alert('Please provide both keys to continue!');
          }
        });
      }

      function showWelcomeMessage() {
        const contentArea = chatBubble.querySelector('.figpal-chat-content');
        contentArea.innerHTML = `
          <div class="figpal-message-row bot">
             <img src="${defaultSprite}" class="figpal-avatar" />
             <div class="figpal-message bot">Hello! I'm now connected and ready to help you design. What's on your mind?</div>
          </div>
          <div class="figpal-quick-actions">
            <div class="figpal-quick-action-btn" data-prompt="Analyze the selected layer for accessibility issues (contrast, font size, touch targets).">Audit Accessibility</div>
            <div class="figpal-quick-action-btn" data-prompt="Proofread the text layers in the selection and suggest grammar/spelling fixes.">Fix Grammar</div>
            <div class="figpal-quick-action-btn" data-prompt="Suggest semantic, descriptive names for the selected layers.">Suggest Names</div>
          </div>
        `;

        // Re-bind quick actions
        const btns = contentArea.querySelectorAll('.figpal-quick-action-btn');
        btns.forEach(btn => {
          btn.addEventListener('click', () => {
            const text = btn.innerText;
            const prompt = btn.dataset.prompt;
            // We show the button text as the user message, but send the detailed prompt to the AI logic if we wanted to be more hidden, 
            // but here handleUserMessage takes what is shown. 
            // To keep it simple and transparent, we'll send the button label as the user message 
            // BUT we actually want the AI to receive the detailed instruction.
            // Let's call handleUserMessage with the visible text, but we need a way to send the *actual* prompt.

            // Actually, the previous implementation mapped text to a response. 
            // Here we want to send the *prompt* to the AI. 
            // Let's modify handleUserMessage signature or just send the prompt directly as invisible text?
            // Or better: Just send the prompt text as the message.
            // contentArea.querySelector('.figpal-quick-actions').style.display = 'none';
            // handleUserMessage(prompt); 

            // However, "Analyze..." is long. Let's show the short text but send the long one?
            // handleUserMessage handles the display. 

            contentArea.querySelector('.figpal-quick-actions').style.display = 'none';

            // Approach: Send the detailed prompt as the "text" so the AI sees it. 
            // It will appear in the chat, which is fine for transparency.
            handleUserMessage(prompt);
          });
        });
      }

      // Check for keys on init
      chrome.storage.local.get(['geminiApiKey', 'figmaPat'], (result) => {
        if (result.geminiApiKey && result.figmaPat) {
          showWelcomeMessage();
        } else {
          showSetupPrompt();
        }
      });

      // --- Icons ---
      const ICONS = {
        FRAME: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1H9C10.1046 1 11 1.89543 11 3V9C11 10.1046 10.1046 11 9 11H3C1.89543 11 1 10.1046 1 9V3C1 1.89543 1.89543 1 3 1ZM3 0C1.34315 0 0 1.34315 0 3V9C0 10.6569 1.34315 12 3 12H9C10.6569 12 12 10.6569 12 9V3C12 1.34315 10.6569 0 9 0H3Z" fill="#888"/></svg>',
        COMPONENT: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1L3.5 3.5L6 6L8.5 3.5L6 1Z" stroke="#7B61FF"/><path d="M1 6L3.5 3.5L6 6L3.5 8.5L1 6Z" stroke="#7B61FF"/><path d="M11 6L8.5 3.5L6 6L8.5 8.5L11 6Z" stroke="#7B61FF"/><path d="M6 11L3.5 8.5L6 6L8.5 8.5L6 11Z" stroke="#7B61FF"/></svg>',
        INSTANCE: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1L3.5 3.5L6 6L8.5 3.5L6 1Z" stroke="#7B61FF"/><path d="M1 6L3.5 3.5L6 6L3.5 8.5L1 6Z" stroke="#7B61FF"/><path d="M11 6L8.5 3.5L6 6L8.5 8.5L11 6Z" stroke="#7B61FF"/><path d="M6 11L3.5 8.5L6 6L8.5 8.5L6 11Z" stroke="#7B61FF"/></svg>',
        TEXT: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 2H4.5V10H2.5V11H9.5V10H7.5V2H9.5V1H2.5V2Z" fill="#888"/></svg>',
        IMAGE: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="10" height="8" rx="1" stroke="#888"/><circle cx="4" cy="4.5" r="1.5" fill="#888"/><path d="M11 7.5L8 4.5L3 9.5H11V7.5Z" fill="#888"/></svg>'
      };

      function parseMarkdown(text) {
        if (!text) return '';
        let html = text;

        // --- 1. Entity Chips: [Type:Name] ---
        html = html.replace(/\[(Frame|Component|Instance|Text|Image|Section|Group):([^\]]+)\]/g, (match, type, name) => {
          const upperType = type.toUpperCase();
          const icon = ICONS[upperType] || ICONS.FRAME;
          return `<span class="figpal-chip type-${type.toLowerCase()}">${icon} ${name.trim()}</span>`;
        });

        // --- 2. Action Cards: [[Action:Title]] ... [Btn:Event] ---
        html = html.replace(/\[\[Action:([^\]]+)\]\]([\s\S]*?)\[([^\]]+):([^\]]+)\]/g, (match, title, desc, btnLabel, eventName) => {
          return `
             <div class="figpal-action-card">
               <div class="action-title">${title.trim()}</div>
               <div class="action-desc">${desc.trim().replace(/\n/g, '<br>')}</div>
               <button class="figpal-action-btn" data-event="${eventName.trim()}">${btnLabel.trim()}</button>
             </div>
           `;
        });

        // --- 3. Standard Markdown ---
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/(<br>){3,}/g, '<br><br>');

        return html;
      }

      function addMessage(text, sender, isThinking = false, isHtml = false) {
        const contentArea = chatBubble.querySelector('.figpal-chat-content');
        const row = document.createElement('div');
        row.classList.add('figpal-message-row', sender);

        if (sender === 'bot') {
          const avatar = document.createElement('img');
          avatar.src = defaultSprite;
          avatar.classList.add('figpal-avatar');
          row.appendChild(avatar);
        }

        const msgDiv = document.createElement('div');
        msgDiv.classList.add('figpal-message', sender);
        if (isThinking) msgDiv.classList.add('thinking');

        // Apply Markdown for bot messages if not already HTML
        if (sender === 'bot' && !isThinking && !isHtml) {
          msgDiv.innerHTML = parseMarkdown(text);

          // Action Button Listeners
          msgDiv.querySelectorAll('.figpal-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const eventName = e.target.dataset.event;
              console.log('Action Clicked:', eventName);
              e.target.disabled = true;
              e.target.textContent = 'Sent';
              e.target.style.opacity = '0.7';

              // Send hidden user message to trigger logic
              handleUserMessage(`[Action Confirmed: ${eventName}]`, `Action ${eventName} confirmed.`);
            });
          });

        } else if (isHtml || (typeof isThinking === 'boolean' && arguments[3] === true)) {
          msgDiv.innerHTML = text;
        } else {
          msgDiv.textContent = text;
        }

        row.appendChild(msgDiv);
        contentArea.appendChild(row);
        contentArea.scrollTop = contentArea.scrollHeight;
        return { row, msgDiv, avatar: row.querySelector('.figpal-avatar') };
      }

      async function fetchFigmaNode(fileKey, nodeId, pat) {
        if (!fileKey || !nodeId || !pat) return null;
        try {
          const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
            headers: { 'X-Figma-Token': pat }
          });
          if (!response.ok) {
            console.error('FigPal: Figma API Error', response.status);
            return null;
          }
          const data = await response.json();
          return data.nodes[nodeId];
        } catch (e) {
          console.error('FigPal: Network Error fetching Figma node', e);
          return null;
        }
      }

      function simplifyNode(node) {
        if (!node) return null;

        // Basic properties
        const simplified = {
          id: node.id,
          name: node.name,
          type: node.type
        };

        // Text content
        if (node.characters) {
          simplified.text = node.characters;
        }

        // Style properties (summarized)
        if (node.fills && node.fills.length > 0) simplified.hasFills = true;
        if (node.strokes && node.strokes.length > 0) simplified.hasStrokes = true;
        if (node.effects && node.effects.length > 0) simplified.hasEffects = true;

        // Layout properties
        if (node.layoutMode) simplified.layoutMode = node.layoutMode;
        if (node.primaryAxisSizingMode) simplified.primaryAxisSizingMode = node.primaryAxisSizingMode;
        if (node.counterAxisSizingMode) simplified.counterAxisSizingMode = node.counterAxisSizingMode;

        // Children recursion
        if (node.children) {
          simplified.childrenCount = node.children.length;
          simplified.children = node.children.map(simplifyNode);
        }

        return simplified;
      }

      async function callGeminiAI(userText, nodeData, apiKey) {
        // Reset controller
        if (currentController) currentController.abort();
        currentController = new AbortController();
        const signal = currentController.signal;

        if (!apiKey) return "Please set your Gemini API key in Settings first! ⚙️";

        const cleanApiKey = apiKey.trim();

        if (!cleanApiKey.startsWith('AIza')) {
          console.error('FigPal: Invalid Key Format. Key should start with AIza.');
          return "Your Gemini API key doesn't look right (it should start with 'AIza'). Please double-check it in AI Studio and use /reset to update.";
        }

        // Fetch selected model from storage, default to list
        const storage = await chrome.storage.local.get(['selectedModel']);
        const userModel = storage.selectedModel || 'gemini-3-flash';

        const modelNames = [userModel, 'gemini-3-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-pro'];
        // Remove duplicates
        const uniqueModels = [...new Set(modelNames)];

        let contextJson = 'No node selected';
        if (nodeData && nodeData.document) {
          const simpleNode = simplifyNode(nodeData.document);
          contextJson = JSON.stringify(simpleNode);
        }

        const systemPrompt = `You are FigPal (aka DS Guardian), a helpful design assistant. 
        You have access to the user's current Figma selection. 
        Context: ${contextJson}.
        Instructions: 
        1. Be EXTREMELY concise. No fluff.
        2. Use bullet points for lists.
        3. Use bolding for key terms.
        4. Focus on design improvements.
        5. When referring to layers/components, use the syntax: [Type:LayerName] (e.g., [Frame:Hero], [Component:Button]).
        6. If you need user approval for an action, use this format:
           [[Action:Title of Action]]
           Short description of what you will do.
           [Button Label:EVENT_NAME]`;

        // Construct full history prompt
        let historyText = '';
        if (chatHistory.length > 0) {
          historyText = "Chat History:\n" + chatHistory.map(msg =>
            `${msg.role === 'user' ? 'User' : 'FigPal'}: ${msg.text}`
          ).join('\n') + "\n\n";
        }

        const fullPrompt = `${systemPrompt}\n\n${historyText}User Question: ${userText}`;

        for (const modelName of uniqueModels) {
          const endpoints = [
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
            `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`
          ];

          for (const endpoint of endpoints) {
            console.log(`FigPal: Attempting ${modelName} via ${endpoint.includes('v1beta') ? 'v1beta' : 'v1'}...`);

            try {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': cleanApiKey
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{ text: fullPrompt }]
                  }]
                }),
                signal: signal
              });

              if (response.ok) {
                const data = await response.json();
                if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.[0]?.text) {
                  return data.candidates[0].content.parts[0].text;
                }
              } else if (response.status === 404) {
                console.warn(`FigPal: ${modelName} not found at current endpoint, trying next...`);
                continue;
              } else {
                const errorBody = await response.json().catch(() => ({}));
                console.error(`FigPal: Gemini API Error (${modelName})`, response.status, errorBody);
                return `AI Error: ${response.status} - ${errorBody.error?.message || 'Check your key via /reset'}`;
              }
            } catch (e) {
              if (e.name === 'AbortError') {
                console.log('FigPal: Request aborted by user.');
                throw e; // Re-throw to be caught by outer handler or just stop
              }
              console.error(`FigPal: Fatal Error with ${modelName}`, e);
            }
          }
        }

        return "Sorry, I tried multiple AI models (Gemini 2.5/3.0) but all returned 404. Please check if your API key has the 'Generative Language API' enabled in Google Cloud Console.";
      }

      async function handleUserMessage(text, specificResponse = null) {
        if (text.trim().toLowerCase() === '/reset') {
          chrome.storage.local.clear(() => {
            alert('FigPal keys cleared. Please refresh to start over.');
            location.reload();
          });
          return;
        }

        if (text.trim().toLowerCase() === '/clear') {
          chatHistory = [];
          addMessage('Conversation history cleared.', 'bot');
          return;
        }

        if (text.trim().toLowerCase() === '/check') {
          const { msgDiv: checkDiv } = addMessage('Running diagnostics...', 'bot');
          chrome.storage.local.get(['geminiApiKey'], async (res) => {
            if (!res.geminiApiKey) {
              checkDiv.textContent = "No Gemini API key found. Use /reset to set it.";
              return;
            }
            const key = res.geminiApiKey.trim();
            checkDiv.textContent = `Testing key (starts with ${key.substring(0, 4)}...)...`;
            try {
              const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
              const resp = await fetch(listUrl);
              const data = await resp.json();
              if (resp.ok) {
                const models = data.models.map(m => m.name.split('/').pop()).join(', ');
                checkDiv.textContent = `Success! Available models: ${models.substring(0, 100)}...`;
              } else {
                checkDiv.textContent = `Key Failed: ${resp.status} - ${data.error?.message || 'Unknown'}`;
              }
            } catch (e) {
              checkDiv.textContent = `Network error during check: ${e.message}`;
            }
          });
          return;
        }

        addMessage(text, 'user');
        chatHistory.push({ role: 'user', text: text }); // Add to history

        const { msgDiv: thinkingBubble, avatar: chatAvatar } = addMessage('Thinking...', 'bot', true);
        follower.src = thinkingSprite;
        follower.classList.add('thinking');
        if (chatAvatar) chatAvatar.src = thinkingSprite;

        // Toggle to Stop Button
        toggleInputState(true);

        // Fetch Keys
        chrome.storage.local.get(['geminiApiKey', 'figmaPat'], async (result) => {
          let responseText = specificResponse;

          try {
            if (!responseText) {
              let nodeContext = null;
              console.log('FigPal Diagnostic:', {
                fileKey: window.figpalFileKey,
                nodeId: window.figpalSelectedNodeId,
                hasPat: !!result.figmaPat,
                hasGeminiKey: !!result.geminiApiKey
              });

              if (window.figpalFileKey && window.figpalSelectedNodeId && result.figmaPat) {
                nodeContext = await fetchFigmaNode(window.figpalFileKey, window.figpalSelectedNodeId, result.figmaPat);
              }

              // Context Size Warning
              if (nodeContext && nodeContext.document) {
                const simple = simplifyNode(nodeContext.document);
                const jsonString = JSON.stringify(simple);

                // Relaxed limit: ~1MB (was 50KB) to allow conversational flow
                if (jsonString.length > 1000000) {
                  thinkingBubble.classList.remove('thinking');
                  if (chatAvatar) chatAvatar.src = defaultSprite;
                  follower.classList.remove('thinking');
                  follower.src = defaultSprite;

                  const warningHtml = `
                    The selected context is large (${Math.round(jsonString.length / 1024)}KB).<br>
                    Processing might be slow.<br>
                    <div class="figpal-warning-actions">
                      <button class="figpal-chat-btn primary" id="btn-proceed">Proceed</button>
                      <button class="figpal-chat-btn" id="btn-cancel">Cancel</button>
                    </div>
                 `;

                  // Replace thinking bubble with warning
                  const { msgDiv: warnDiv } = addMessage(warningHtml, 'bot', false, true);
                  // Fix: Remove the entire row of the thinking bubble
                  const thinkingRow = thinkingBubble.closest('.figpal-message-row');
                  if (thinkingRow) thinkingRow.remove();

                  // Add listeners
                  setTimeout(() => {
                    const pBtn = warnDiv.querySelector('#btn-proceed');
                    const cBtn = warnDiv.querySelector('#btn-cancel');

                    if (pBtn) pBtn.onclick = async () => {
                      // Fix: Remove warning row
                      const warnRow = warnDiv.closest('.figpal-message-row');
                      if (warnRow) warnRow.remove();

                      const { msgDiv: newThinking, avatar: newAvatar } = addMessage('Processing large context...', 'bot', true);
                      follower.classList.add('thinking');

                      const resp = await callGeminiAI(text, nodeContext, result.geminiApiKey);

                      newThinking.classList.remove('thinking');
                      newThinking.textContent = resp;
                      follower.classList.remove('thinking');
                    };

                    if (cBtn) cBtn.onclick = () => {
                      warnDiv.innerHTML = "Request cancelled due to size.";
                    };
                  }, 0);

                  return; // Stop initial flow
                }
              }

              responseText = await callGeminiAI(text, nodeContext, result.geminiApiKey);
            }

            // If aborted, responseText might be undefined or we might have thrown
            if (!responseText) return; // Handled by abort listener

            thinkingBubble.classList.remove('thinking');
            thinkingBubble.innerHTML = parseMarkdown(responseText); // Fix: Parse Markdown

            chatHistory.push({ role: 'model', text: responseText }); // Add to history

            // Re-attach Action Button Listeners for the updated content
            thinkingBubble.querySelectorAll('.figpal-action-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const eventName = e.target.dataset.event;
                console.log('Action Clicked:', eventName);
                e.target.disabled = true;
                e.target.textContent = 'Sent';
                e.target.style.opacity = '0.7';
                handleUserMessage(`[Action Confirmed: ${eventName}]`, `Action ${eventName} confirmed.`);
              });
            });

          } catch (err) {
            if (err.name === 'AbortError') return; // Already handled
            thinkingBubble.textContent = "Error: " + err.message;
            thinkingBubble.classList.remove('thinking');
          } finally {
            toggleInputState(false); // Back to Send
            currentController = null;

            follower.src = defaultSprite;
            follower.classList.remove('thinking');
            if (chatAvatar) chatAvatar.src = defaultSprite;
            const contentArea = chatBubble.querySelector('.figpal-chat-content');
            contentArea.scrollTop = contentArea.scrollHeight;
          }
        });
      }

      function setupInputListeners() {
        const input = chatBubble.querySelector('.figpal-chat-input-area input');
        if (!input) return;

        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && input.value.trim() !== '') {
            const userText = input.value.trim();
            input.value = '';
            handleUserMessage(userText);
          }
        });
        input.addEventListener('paste', (e) => e.stopPropagation());
        input.addEventListener('contextmenu', (e) => e.stopPropagation());
      }

      setupInputListeners();

      let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;
      let ghostX = 0, ghostY = 0;
      const ghostSpeed = 0.15;
      const followSpeed = 0.10;

      let isFollowing = false;
      let isReturningHome = false; // New flag for "Stay Put" logic
      container.classList.add('resting');

      let isDraggingChat = false;
      let hasDragged = false; // To distinguish click vs drag

      follower.addEventListener('click', (e) => {
        if (hasDragged) {
          hasDragged = false;
          return;
        }
        e.stopPropagation();

        if (container.classList.contains('resting')) {
          // Wake up
          isFollowing = true;
          isReturningHome = false;
          container.classList.remove('resting');
          // Ghost starts at current position
          ghostX = currentX;
          ghostY = currentY;
        } else {
          // Toggle chat but STAY PUT
          isFollowing = false;
          isReturningHome = false;
          container.classList.toggle('chat-visible');
        }
      });

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });

      function animate() {
        const restingX = window.innerWidth / 2 + 180;
        const restingY = window.innerHeight - 80;

        let targetX = currentX;
        let targetY = currentY;
        let activePhysics = false;

        if (isFollowing && !container.classList.contains('chat-visible')) {
          // Follow cursor
          targetX = mouseX + 28;
          targetY = mouseY + 28;
          activePhysics = true;
        } else if (isReturningHome && !container.classList.contains('resting')) {
          // Return Home
          targetX = restingX;
          targetY = restingY;
          activePhysics = true;

          // Check arrival (position)
          if (Math.abs(currentX - restingX) < 1 && Math.abs(currentY - restingY) < 1) {
            container.classList.add('resting');
            isReturningHome = false;
            activePhysics = false;
            currentX = restingX;
            currentY = restingY;
          }
        } else if (container.classList.contains('resting')) {
          currentX = restingX;
          currentY = restingY;
          // Reset ghost to home
          ghostX = restingX;
          ghostY = restingY;
        }

        if (activePhysics && !isDraggingChat) {
          // Double Lerp (Ghost Follows Target, Current Follows Ghost)
          ghostX += (targetX - ghostX) * ghostSpeed;
          ghostY += (targetY - ghostY) * ghostSpeed;

          currentX += (ghostX - currentX) * followSpeed;
          currentY += (ghostY - currentY) * followSpeed;

          container.style.left = currentX + 'px';
          container.style.top = currentY + 'px';
          container.style.transform = '';
        } else if (!container.classList.contains('resting') && !activePhysics) {
          // But ensure we reflect currentX in style if not resting
          if (!isDraggingChat) {
            // Maybe drift to stop if we were moving?
            // For now, simple stop.
            container.style.left = currentX + 'px';
            container.style.top = currentY + 'px';
          }
        }

        requestAnimationFrame(animate);
      }

      chatBubble.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
      currentX = window.innerWidth / 2;
      currentY = window.innerHeight - 100;
      animate();

      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyD' && e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          // If resting, wake up + show chat
          if (container.classList.contains('resting')) {
            isFollowing = false; // Stay put where it lands? No, usually follows cursor or stays home? 
            // Let's say it wakes up to floating state at home
            container.classList.remove('resting');
            isReturningHome = false;
            container.classList.add('chat-visible');
          } else {
            container.classList.toggle('chat-visible');
          }

          if (container.classList.contains('chat-visible')) {
            const input = chatBubble.querySelector('input');
            if (input) setTimeout(() => input.focus(), 50);
          }
        }
        if (e.code === 'Escape') {
          if (container.classList.contains('chat-visible')) {
            // 1. Close Chat
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('chat-visible');
            document.activeElement?.blur();
          } else if (isFollowing) {
            // 2. If Following -> Go Home
            e.preventDefault();
            e.stopPropagation();
            isFollowing = false;
            isReturningHome = true;
          } else if (!container.classList.contains('resting')) {
            // 3. If Floating (not resting, not following) -> Wake Up (Follow)
            e.preventDefault();
            e.stopPropagation();
            isFollowing = true;
            isReturningHome = false;
          }
        }
      }, { capture: true });

      let isResizing = false, activeHandle = null;
      let startWidth = 302, startHeight = 400, startMouseX = 0, startMouseY = 0;
      let dragOffsetX = 0, dragOffsetY = 0;

      const resizers = chatBubble.querySelectorAll('.figpal-resizer');
      resizers.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault(); e.stopPropagation();
          isResizing = true;
          activeHandle = handle;
          startMouseX = e.clientX; startMouseY = e.clientY;
          const rect = chatBubble.getBoundingClientRect();
          startWidth = rect.width; startHeight = rect.height;
          container.classList.add('resizing');
        });
      });

      let startDragX = 0, startDragY = 0;

      follower.addEventListener('mousedown', (e) => {
        // Can drag if not resting (floating or following)
        if (!container.classList.contains('resting')) {
          isDraggingChat = true;
          hasDragged = false;
          startDragX = e.clientX;
          startDragY = e.clientY;
          dragOffsetX = e.clientX - currentX;
          dragOffsetY = e.clientY - currentY;
          e.preventDefault(); e.stopPropagation();
        }
      });


      window.addEventListener('mousemove', (e) => {
        if (isResizing) {
          const deltaX = e.clientX - startMouseX;
          const deltaY = e.clientY - startMouseY;
          if (activeHandle.classList.contains('top') || activeHandle.classList.contains('top-left') || activeHandle.classList.contains('top-right')) {
            chatBubble.style.height = Math.max(200, startHeight - deltaY) + 'px';
          }
          if (activeHandle.classList.contains('left') || activeHandle.classList.contains('top-left') || activeHandle.classList.contains('bottom-left')) {
            chatBubble.style.width = Math.max(280, startWidth - deltaX) + 'px';
          } else if (activeHandle.classList.contains('right') || activeHandle.classList.contains('top-right') || activeHandle.classList.contains('bottom-right')) {
            chatBubble.style.width = Math.max(280, startWidth + deltaX) + 'px';
          }
          return;
        }
        if (isDraggingChat) {
          // Drag Threshold check (3px)
          const moveDist = Math.hypot(e.clientX - startDragX, e.clientY - startDragY);
          if (moveDist > 3) {
            hasDragged = true; // Only mark as dragged if moved > 3px
          }

          currentX = e.clientX - dragOffsetX;
          currentY = e.clientY - dragOffsetY;
          container.style.left = currentX + 'px';
          container.style.top = currentY + 'px';
        }
      });

      window.addEventListener('mouseup', () => {
        isDraggingChat = false;
        if (isResizing) {
          isResizing = false;
          activeHandle = null;
          container.classList.remove('resizing');
        }
      });

      console.log('DS Guardian: Loaded successfully!');
    }
  }

  initFigPal();
})();
