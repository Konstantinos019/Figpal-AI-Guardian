// Create the container `div`
const container = document.createElement('div');
container.id = 'figpal-container';
// Enforce style here to avoid CSS caching issues (28px, 28px)
container.style.transform = 'translate(28px, 28px)';

// Create the follower element (character)
const follower = document.createElement('img');
follower.id = 'figpal-follower';
follower.src = chrome.runtime.getURL('assets/selection.svg');
follower.onerror = () => console.error('FigPal Error: Could not load image from', follower.src);
follower.onload = () => console.log('FigPal Image loaded successfully');

// Create the chat bubble
const chatBubble = document.createElement('div');
chatBubble.id = 'figpal-chat-bubble';
chatBubble.innerHTML = `
  <div class="figpal-chat-header">
    <span>FigPal name</span>
    <button class="figpal-close-btn" aria-label="Close chat">×</button>
  </div>
  <div class="figpal-chat-content">
    <div class="figpal-message-row bot">
       <!-- Avatar injected via JS usually, but for initial HTML we add it manually or via JS init. 
            Let's add it here for consistency if we can't use runtime URL easily in template string without variable.
            Actually, we can use the variable if we have it. -->
       <img src="${chrome.runtime.getURL('assets/selection.svg')}" class="figpal-avatar" />
       <div class="figpal-message bot">Hello! How can I help you design today?</div>
    </div>
    <div class="figpal-quick-actions">
      <div class="figpal-quick-action-btn">Compare component against codebase</div>
      <div class="figpal-quick-action-btn">Check component for design token usage</div>
      <div class="figpal-quick-action-btn">Check design for tokens</div>
      <div class="figpal-quick-action-btn">Workflows</div>
    </div>
  </div>
  <div class="figpal-chat-input-area">
    <input type="text" placeholder="Ask me anything..." />
  </div>
`;

// Assemble
container.appendChild(follower);
container.appendChild(chatBubble);
document.body.appendChild(container);

// Quick Action Logic
const quickActionsContainer = chatBubble.querySelector('.figpal-quick-actions');
const quickActionBtns = chatBubble.querySelectorAll('.figpal-quick-action-btn');
const closeBtn = chatBubble.querySelector('.figpal-close-btn');

// Close Button Logic
closeBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent bubbling logic (like closing then opening if attached to container click)
  container.classList.remove('chat-visible');
});

// Responses map
const botResponses = {
  "Compare component against codebase": "Nice! please select your component first!",
  "Check component for design token usage": "I'm ready. Select the layer or component you'd like me to scan for design token compliance.",
  "Check design for tokens": "I will analyze the current page for hardcoded values. Shall I proceed with the scan?",
  "Workflows": "Which workflow would you like to start? I can help with Handoff, Audits, or Style Sync."
};

quickActionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.innerText;

    // Hide buttons after selection to keep chat clean
    quickActionsContainer.style.display = 'none';

    // Handle the flow
    handleUserMessage(text, botResponses[text]);
  });
});

// Chat Logic
const chatContent = chatBubble.querySelector('.figpal-chat-content');
const chatInput = chatBubble.querySelector('input');
// Helper to add messages
function addMessage(text, sender, isThinking = false) {
  const contentArea = chatBubble.querySelector('.figpal-chat-content');

  // Create Row Container
  const row = document.createElement('div');
  row.classList.add('figpal-message-row', sender);

  // If Bot, add Avatar
  if (sender === 'bot') {
    // Hide previous avatars
    const existingAvatars = contentArea.querySelectorAll('.figpal-avatar');
    existingAvatars.forEach(avatar => {
      avatar.remove();
    });

    const avatar = document.createElement('img');
    avatar.src = chrome.runtime.getURL('assets/selection.svg'); // Reuse the FigPal SVG
    avatar.classList.add('figpal-avatar');
    row.appendChild(avatar);
  }

  // Create Message Bubble/Text
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('figpal-message', sender);
  if (isThinking) msgDiv.classList.add('thinking');
  msgDiv.textContent = text;

  row.appendChild(msgDiv);
  contentArea.appendChild(row);
  contentArea.scrollTop = contentArea.scrollHeight; // Auto-scroll

  return { row, msgDiv };
}

// Helper to call the Guardian API
async function queryGuardian(userText) {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userText }]
      })
    });

    if (!response.ok) {
      throw new Error(`Guardian Connection Failed: ${response.status}`);
    }

    // For now, handle simple text response.
    // Ideally we should handle streaming, but let's start with simple text.
    // The previous analysis showed it returns a standard AI SDK response.
    // We might need to handle the stream or text based on how the API is set up.
    // Let's assume text for MVP simplicity or read the stream.

    // Quick stream reader to get full text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    // The "stream" might be Vercel AI SDK format (complex parts).
    // Let's just try to parse the text or return it raw for now.
    // If it's Vercel AI SDK, it might be sending data parts.
    // Simplified regex to just extract text content from standard stream format if needed.
    // But for a hackathon MVP, let's just dump the text and refine.
    return result;

  } catch (error) {
    console.error('Guardian Error:', error);
    return "I'm having trouble connecting to my brain (Guardian). Is the local server running on port 3000?";
  }
}

async function handleUserMessage(text, specificResponse = null) {
  addMessage(text, 'user');

  // Show thinking state with Avatar
  const { msgDiv: thinkingBubble } = addMessage('Thinking...', 'bot', true);

  // If specific response is provided (e.g. from quick actions that are hardcoded for now), use it.
  // OR we can send those to the AI too. Let's send everything to AI for "intelligence".
  // But if we want to keep the "canned" ones instant, we can check specificResponse.

  let replyText = specificResponse;

  if (!replyText) {
    // Fetch from AI
    // We can update the UI while it thinks
    try {
      const rawResponse = await queryGuardian(text);

      // Clean up the Vercel AI stream format if necessary. 
      // Vercel AI stream is usually: 0:"text"
      // Let's simple-clean it:
      const cleanText = rawResponse.replace(/^\d+:"/gm, '').replace(/"$/gm, '').replace(/\\n/g, '\n');
      replyText = cleanText || rawResponse;

    } catch (e) {
      replyText = "Error communicating with Guardian.";
    }
  }

  thinkingBubble.classList.remove('thinking');
  thinkingBubble.textContent = replyText;

  // Auto-scroll again in case text expansion pushes it down
  const contentArea = chatBubble.querySelector('.figpal-chat-content');
  contentArea.scrollTop = contentArea.scrollHeight;
}

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    const userText = chatInput.value.trim();
    chatInput.value = '';

    // Standard flow (generic reply for typed messages)
    handleUserMessage(userText);
  }
});

// Physics / Smooth Follow Logic
let mouseX = 0;
let mouseY = 0;
let currentX = 0;
let currentY = 0;
const speed = 0.12; // "Gravity" / Smoothness factor
let isFollowing = false; // Start in resting state

// Initialize resting state
container.classList.add('resting');

// Click to start following
follower.addEventListener('click', (e) => {
  if (!isFollowing) {
    e.stopPropagation(); // Prevent ensuring click doesn't bubble if needed
    isFollowing = true;
    container.classList.remove('resting');
    console.log('FigPal started following!');
  }
});

// Track mouse position
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Animation Loop
function animate() {
  if (isFollowing) {
    // Only animate if chat is NOT visible (detached mode)
    if (!container.classList.contains('chat-visible')) {
      // Linear Interpolation (Lerp)
      currentX += (mouseX - currentX) * speed;
      currentY += (mouseY - currentY) * speed;

      container.style.left = currentX + 'px';
      container.style.top = currentY + 'px';
    }
  } else {
    // Resting Position Logic is handled via CSS class .resting
    // But we need to sync JS coordinates so it doesn't jump when we start following
    const rekt = container.getBoundingClientRect();
    currentX = rekt.left;
    currentY = rekt.top;
  }

  requestAnimationFrame(animate);
}

// Prevent scroll propagation from chat to Figma canvas
chatBubble.addEventListener('wheel', (e) => {
  e.stopPropagation();
}, { passive: false });

// Initialize position to avoid jump (not strictly needed with the else block above, but good practice)
currentX = window.innerWidth / 2;
currentY = window.innerHeight - 100; // Approx bottom
animate();

// Toggle chat visibility
window.addEventListener('keydown', (e) => {
  // Debug log
  console.log('FigPal Key:', e.key, 'Alt:', e.altKey);

  // Check for Option + d (Alt + d)
  // This allows triggering even while typing in a text box
  if (e.code === 'KeyD' && e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();

    container.classList.toggle('chat-visible');

    // Auto-focus input when opening
    if (container.classList.contains('chat-visible')) {
      const input = chatBubble.querySelector('input');
      if (input) setTimeout(() => input.focus(), 50);
    }
  }

  // Check for Escape key
  if (e.code === 'Escape') {
    // 1. If chat is visible, close it
    if (container.classList.contains('chat-visible')) {
      e.preventDefault();
      e.stopPropagation();
      container.classList.remove('chat-visible');
      document.activeElement?.blur();
      console.log('FigPal: Chat closed by Esc');
    }
    // 2. If chat is NOT visible but FigPal is following, return to resting
    else if (isFollowing) {
      e.preventDefault();
      e.stopPropagation();
      isFollowing = false;
      container.classList.add('resting');
      console.log('FigPal: Returning to resting state by Esc');
    }
  }
}, { capture: true });

// Dragging Logic
let isDraggingChat = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Attach drag listener to FOLLOWER (Character) instead of specific handle
follower.addEventListener('mousedown', (e) => {
  // Only drag if the chat is visible. Otherwise it's just the "follow me" button.
  if (container.classList.contains('chat-visible')) {
    isDraggingChat = true;
    container.classList.remove('resting'); // Ensure we can move it

    const currentLeft = container.offsetLeft;
    const currentTop = container.offsetTop;

    dragOffsetX = e.clientX - currentLeft;
    dragOffsetY = e.clientY - currentTop;

    e.preventDefault();
    e.stopPropagation();
  }
});

window.addEventListener('mousemove', (e) => {
  // Handle Chat Dragging
  if (isDraggingChat) {
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // Update container position
    container.style.left = x + 'px';
    container.style.top = y + 'px';

    // Sync currentX/Y so other animations don't jump
    currentX = x;
    currentY = y;
  }
  // Handle Follower Tracking (existing logic)
  else {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }
});

window.addEventListener('mouseup', () => {
  if (isDraggingChat) {
    isDraggingChat = false;
  }
});

// Add mouse move listener - using animate() now
// window.addEventListener('mousemove', updatePosition);

console.log('FigPal Cursor Follower & Chat loaded!');
