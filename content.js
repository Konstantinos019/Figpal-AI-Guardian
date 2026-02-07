(function () {
  let isInjected = false;

  function initFigPal() {
    // Continuous polling to handle SPA navigation and wait for specific Figma UI
    setInterval(() => {
      // 1. Check URL - matches /design/, /file/, or /proto/
      const isFigmaFile = /figma\.com\/(design|file|proto)\//.test(window.location.href);

      if (!isFigmaFile) {
        return;
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
          <button class="figpal-close-btn" aria-label="Close chat">×</button>
        </div>
        <div class="figpal-chat-content">
          <div class="figpal-message-row bot">
             <img src="${defaultSprite}" class="figpal-avatar" />
             <div class="figpal-message bot">Hello! How can I help you design today?</div>
          </div>
          <div class="figpal-quick-actions">
            <div class="figpal-quick-action-btn">Compare component against codebase</div>
            <div class="figpal-quick-action-btn">Check component for design token usage</div>
            <div class="figpal-quick-action-btn">Check design for tokens</div>
          </div>
        </div>
        <div class="figpal-chat-input-area">
          <input type="text" placeholder="Ask me anything..." />
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

      // Quick Action Logic
      const quickActionsContainer = chatBubble.querySelector('.figpal-quick-actions');
      const quickActionBtns = chatBubble.querySelectorAll('.figpal-quick-action-btn');
      const closeBtn = chatBubble.querySelector('.figpal-close-btn');

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.remove('chat-visible');
      });

      const botResponses = {
        "Compare component against codebase": "Nice! please select your component first!",
        "Check component for design token usage": "I'm ready. Select the layer or component you'd like me to scan for design token compliance.",
        "Check design for tokens": "I will analyze the current page for hardcoded values. Shall I proceed with the scan?"
      };

      quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.innerText;
          quickActionsContainer.style.display = 'none';
          handleUserMessage(text, botResponses[text]);
        });
      });

      const chatInput = chatBubble.querySelector('input');

      function addMessage(text, sender, isThinking = false) {
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
        msgDiv.textContent = text;

        row.appendChild(msgDiv);
        contentArea.appendChild(row);
        contentArea.scrollTop = contentArea.scrollHeight;
        return { row, msgDiv, avatar: row.querySelector('.figpal-avatar') };
      }

      function handleUserMessage(text, specificResponse = null) {
        addMessage(text, 'user');
        const { msgDiv: thinkingBubble, avatar: chatAvatar } = addMessage('Thinking...', 'bot', true);
        follower.src = thinkingSprite;
        follower.classList.add('thinking');
        if (chatAvatar) chatAvatar.src = thinkingSprite;

        setTimeout(() => {
          thinkingBubble.classList.remove('thinking');
          thinkingBubble.textContent = specificResponse || "Let me know, and I’ll help you right away!";
          follower.src = defaultSprite;
          follower.classList.remove('thinking');
          if (chatAvatar) chatAvatar.src = defaultSprite;
          const contentArea = chatBubble.querySelector('.figpal-chat-content');
          contentArea.scrollTop = contentArea.scrollHeight;
        }, 1000);
      }

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
          const userText = chatInput.value.trim();
          chatInput.value = '';
          handleUserMessage(userText);
        }
      });

      let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;
      const speed = 0.12;
      let isFollowing = false;
      container.classList.add('resting');

      follower.addEventListener('click', (e) => {
        if (!isFollowing) {
          e.stopPropagation();
          isFollowing = true;
          container.classList.remove('resting');
        }
      });

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });

      function animate() {
        const restingX = window.innerWidth / 2 + 180;
        const restingY = window.innerHeight - 80;

        if (isFollowing) {
          if (!container.classList.contains('chat-visible')) {
            // Apply the 28px offset directly in the target calculation 
            // instead of using a CSS transform. This prevents "snapping" when returning home.
            currentX += (mouseX + 28 - currentX) * speed;
            currentY += (mouseY + 28 - currentY) * speed;
            container.style.left = currentX + 'px';
            container.style.top = currentY + 'px';
            container.style.transform = ''; // Ensure no transform fights with us
          }
        } else if (!container.classList.contains('resting')) {
          // Smoothly Lerp back home before switching to stable CSS
          currentX += (restingX - currentX) * speed;
          currentY += (restingY - currentY) * speed;
          container.style.left = currentX + 'px';
          container.style.top = currentY + 'px';
          container.style.transform = '';

          // Once close enough, hand off to stable CSS
          if (Math.abs(currentX - restingX) < 1 && Math.abs(currentY - restingY) < 1) {
            container.classList.add('resting');
          }
        } else {
          // We are resting, sync current coordinates to resting spot just in case
          currentX = restingX;
          currentY = restingY;
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
          container.classList.toggle('chat-visible');
          if (container.classList.contains('chat-visible')) {
            const input = chatBubble.querySelector('input');
            if (input) setTimeout(() => input.focus(), 50);
          }
        }
        if (e.code === 'Escape') {
          if (container.classList.contains('chat-visible')) {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('chat-visible');
            document.activeElement?.blur();
          } else if (isFollowing) {
            e.preventDefault();
            e.stopPropagation();
            isFollowing = false;
            // Note: .resting class is now added by animate() once it arrives home
          }
        }
      }, { capture: true });

      let isDraggingChat = false, isResizing = false, activeHandle = null;
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

      follower.addEventListener('mousedown', (e) => {
        if (container.classList.contains('chat-visible')) {
          isDraggingChat = true;
          container.classList.remove('resting');
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
