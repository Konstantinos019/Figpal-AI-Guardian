// Create the container `div`
const container = document.createElement('div');
container.id = 'figpal-container';

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
  <div class="figpal-chat-header">FigPal</div>
  <div class="figpal-chat-content">
    <div class="figpal-message bot">Hello! How can I help you design today?</div>
  </div>
  <div class="figpal-chat-input-area">
    <input type="text" placeholder="Ask me anything..." />
  </div>
`;

// Assemble
container.appendChild(follower);
container.appendChild(chatBubble);
document.body.appendChild(container);

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

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    const userText = chatInput.value.trim();
    chatInput.value = '';

    // 1. Add User Message
    addMessage(userText, 'user');

    // 2. Show thinking state
    const thinkingDiv = document.createElement('div');
    thinkingDiv.classList.add('figpal-message', 'thinking');
    thinkingDiv.textContent = 'Thinking...';
    chatContent.appendChild(thinkingDiv);
    chatContent.scrollTop = chatContent.scrollHeight;

    // 3. Fake delay then reply
    setTimeout(() => {
      thinkingDiv.remove();
      addMessage("What's up?", 'bot');
    }, 1500);
  }
});

// Function to update position
function updatePosition(e) {
  // Update container position instead of just image
  container.style.top = e.clientY + 'px';
  container.style.left = e.clientX + 'px';
}

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

  // Check for Escape key to close
  if (e.code === 'Escape') {
    console.log('FigPal Esc pressed. Visible:', container.classList.contains('chat-visible'));

    if (container.classList.contains('chat-visible')) {
      e.preventDefault();
      e.stopPropagation(); // Try to stop Figma from deselecting things if we are just closing chat
      console.log('FigPal Closing chat...');
      container.classList.remove('chat-visible');
      document.activeElement?.blur();
    }
  }
}, { capture: true });

// Add mouse move listener
window.addEventListener('mousemove', updatePosition);

console.log('FigPal Cursor Follower & Chat loaded!');
