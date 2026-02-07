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
    <div class="figpal-message bot">Hello! How can I help you design today?</div>
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

function addMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('figpal-message', sender);
  msgDiv.textContent = text;
  chatContent.appendChild(msgDiv);
  chatContent.scrollTop = chatContent.scrollHeight; // Auto-scroll
}

function handleUserMessage(text, specificResponse = null) {
  addMessage(text, 'user');

  // Show thinking state
  const thinkingDiv = document.createElement('div');
  thinkingDiv.classList.add('figpal-message', 'thinking');
  thinkingDiv.textContent = 'Thinking...';
  chatContent.appendChild(thinkingDiv);
  chatContent.scrollTop = chatContent.scrollHeight;

  // Fake delay then reply
  setTimeout(() => {
    thinkingDiv.remove();
    const reply = specificResponse || "Let me know, and I’ll help you right away!";
    addMessage(reply, 'bot');

    // If it's the "Compare" flow, we might want to check the selection (future enhancement)
    // For now, the user specifically asked for this text.
  }, 1000);
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

// Add mouse move listener - using animate() now
// window.addEventListener('mousemove', updatePosition);

console.log('FigPal Cursor Follower & Chat loaded!');
