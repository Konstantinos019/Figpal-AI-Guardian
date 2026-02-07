# FigPal AI - Your Intelligent Design Companion

FigPal is a Chrome Extension that adds a friendly, intelligent assistant to your Figma experience. It follows your cursor and provides real-time, context-aware help using a local AI brain.

## 🌟 Features

- **Cursor Follower**: A friendly character that stays with you as you design.
- **Smart Chat**: Press `Alt + D` to chat with FigPal.
- **Local AI Brain**: Powered by a local "Guardian" bot (Next.js + Vercel AI SDK) that runs on your machine, ensuring your data stays private and interactions are fast.
- **Design System Guardian**: (Beta) Can warn you about "snowflake" components and suggest design system patterns.

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Chrome Browser** (or Chromium-based browser)
- **API Key**: An API key for xAI (Grok) or a compatible provider (configured in the bot).

### 2. Set Up the AI Brain (Local Server)
The "brain" of FigPal runs locally on port 3000.

1.  Navigate to the project folder in your terminal.
2.  **Configure API Key**:
    - Go to `figpal-bot/`
    - Rename/Copy `.env.local.template` (or create new) to `.env.local`
    - Add your key: `XAI_API_KEY=your_key_here`
3.  **Start the Server**:
    - Run the helper script from the root:
      ```bash
      ./start_guardian.sh
      ```
    - Wait until you see the server running at `http://localhost:3000`.

### 3. Install the Chrome Extension
1.  Open Chrome and go to `chrome://extensions`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the **root folder** of this project (where `manifest.json` is located).
5.  Reflow your Figma tab.

## 🎮 Usage
- **Toggle Chat**: Click the FigPal character or press `Alt + D`.
- **Ask Questions**: "How do I use the button component?" or "Check this design."
- **Drag**: You can drag the chat window anywhere on the screen.

## 📁 Project Structure
- `content.js`: The extension logic injected into Figma.
- `styles.css`: The look and feel of FigPal.
- `figpal-bot/`: The local Next.js server handling AI logic.
- `start_guardian.sh`: Quick start script.
