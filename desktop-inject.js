(function () {
  const css = `
/* Auth Modal */
#figpal-auth-modal {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}
.figpal-auth-content {
  width: 80%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.figpal-auth-content h3 { margin: 0; font-size: 18px; color: #333; }
.figpal-auth-content p { margin: 0; font-size: 13px; color: #666; margin-bottom: 8px; }
.figpal-auth-content label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; }
.figpal-auth-content input, .figpal-auth-content select {
  padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;
}
#figpal-auth-save {
  margin-top: 8px;
  padding: 10px;
  background: #0D99FF;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
#figpal-auth-save:hover { background: #007BE5; }

/* Container handling positioning */
#figpal-container {
  position: fixed;
  z-index: 2147483647; /* Set to absolute max to float over Figma UI */
  pointer-events: none;
  transform: translate(28px, 28px);
  will-change: top, left;
  width: 0;
  height: 0;
  overflow: visible;
  color-scheme: light;
}

#figpal-home {
  position: fixed;
  left: calc(50% + 180px);
  bottom: 60px;
  transform: translateX(-50%);
  width: 105px;
  height: 62px;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease-out, visibility 0.3s;
}

#figpal-container:not(.resting)+#figpal-home,
#figpal-container:not(.resting)~#figpal-home {
  opacity: 1;
  visibility: visible;
}

#figpal-follower {
  position: absolute;
  width: 52px;
  height: 58px;
  display: block;
  transform: translate(-50%, -50%);
  z-index: 20;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

#figpal-follower.thinking {
  scale: 1.1;
}

#figpal-container.chat-visible #figpal-follower {
  left: auto;
  right: -32px;
  top: auto;
  bottom: -36px;
  transform: translate(0, 0) rotate(0deg);
  cursor: grab;
}

#figpal-container.chat-visible #figpal-follower:active {
  cursor: grabbing;
}

#figpal-container.resting {
  left: calc(50% + 180px) !important;
  top: auto !important;
  bottom: 80px !important;
  transform: none !important;
  z-index: 100000;
}

#figpal-container.resting #figpal-follower {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translate(-50%, -50%) translateY(0px); }
  50% { transform: translate(-50%, -50%) translateY(-6px); }
  100% { transform: translate(-50%, -50%) translateY(0px); }
}

#figpal-chat-bubble {
  position: absolute;
  bottom: 0px;
  left: 0px;
  transform: translateX(-100%) translateY(-20px) scale(0.9);
  transform-origin: bottom right;
  width: 302px;
  min-width: 280px;
  max-width: 800px;
  height: 400px;
  min-height: 200px;
  max-height: 80vh;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 20px 25px -5px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
  pointer-events: none;
  overflow: hidden;
  font-family: "Inter", sans-serif;
  color: #1e1e1e;
  display: flex;
  flex-direction: column;
}

#figpal-container.chat-visible #figpal-chat-bubble {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-100%) translateY(-20px) scale(1);
}

.figpal-chat-header {
  padding: 14px 17px;
  font-weight: 600;
  font-size: 16px;
  background: #F7F7F7;
  border-bottom: 1px solid #E5E5E5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.figpal-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #888;
  cursor: pointer;
  padding: 0 4px;
}

.figpal-chat-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #FFFFFF;
}

.figpal-message-row { display: flex; gap: 12px; align-items: flex-start; }
.figpal-message-row.user { flex-direction: row-reverse; }
.figpal-avatar { width: 24px; height: 24px; object-fit: contain; }
.figpal-message { max-width: 85%; word-wrap: break-word; font-size: 14px; line-height: 1.5; }
.figpal-message.bot { background: transparent; color: #1E1E1E; }
.figpal-message.user { background: #F0F0F0; padding: 8px 16px; border-radius: 20px 20px 4px 20px; }
.figpal-message.thinking { color: #888; font-style: italic; }

.figpal-quick-actions { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.figpal-quick-action-btn { background: #FFFFFF; border: 1px solid #CCCCCC; border-radius: 6px; padding: 8px 12px; font-size: 12px; cursor: pointer; }

.figpal-chat-input-area { padding: 16px; }
.figpal-chat-input-area input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #0D99FF; outline: none; box-shadow: 0 0 0 1px #0D99FF; }

.figpal-resizer { position: absolute; z-index: 1000; }
.figpal-resizer.top { top: 0; left: 10px; right: 10px; height: 6px; cursor: n-resize; }
.figpal-resizer.left { top: 10px; bottom: 0; left: 0; width: 10px; cursor: ew-resize; }
.figpal-resizer.right { top: 10px; bottom: 10px; right: 0; width: 10px; cursor: ew-resize; }
.figpal-resizer.top-left { top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; }
.figpal-resizer.top-right { top: 0; right: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.figpal-resizer.bottom-left { bottom: 0; left: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.figpal-resizer.bottom-right { bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; }

.figpal-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 5px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0 4px;
  transition: background 0.1s, color 0.1s;
}

.figpal-toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.figpal-toolbar-btn.selected {
  background: #0D99FF !important;
}

.figpal-toolbar-btn svg {
  width: 22px;
  height: 22px;
  transition: fill 0.1s;
}

.figpal-toolbar-btn.selected svg path {
  fill: #FFFFFF !important;
}

.figpal-toolbar-btn svg path {
  fill: #1A1A1A;
}
`;

  const ASSETS = {
    selection: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNTgiIHZpZXdCb3g9IjAgMCA1MiA1OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTguNjc2ODMgMjkuOTI0M0M4LjY4MDYgMzEuNzk3MyA0LjAxMDQ4IDM4LjgwMTggMy4wOTY5MiA0MC40NzA1QzMuMDk2OTIgNDQuMDg2MyAzLjM4NjMxIDQ0Ljk2MjggNS43NTQwMiA0Ni45NDQ1QzEyLjk0MDkgNTQuNTcwMSAyNS4yMDI4IDU1Ljk5OTkgMzQuMjQyMiA1NS45OTk5QzYxLjcyMTkgNTUuOTk5OSA0NS4xNjAxIDI3Ljg3NTEgMjguNDYzIDIyLjY2NDNDMjAuNjA1IDIwLjIxMTcgMTguMTI3OCAyMi44NDExIDE1LjU0MSAyNC4yODU3QzEyLjkwODggMjUuNzUgITAuNzU5MiAyNy43MTQ4IDguNjc2ODMgMjkuOTI0M1oiIGZpbGw9IiNBRkJDQ0YiLz4KPHBhdGggZD0iTTMxLjQ4MzYgNDIuNzE1NUMyNy4xNzE0IDQwLjAyNDEgMjEuMzA0IDM5LjkzMzggMTYuNTM3NCAzOC45NTY1QzEzLjcwODkgMzguMzc2NSAxMC42MDQgMzYuNjA3MSA3Ljc2ODk5IDM2LjYwNzFDNS4wODg5IDM2LjYwNzEgNy44NzMzIDMwLjc3NjkgOC42NzY4MyAyOS45MjQzQzEwLjc1OTIgMjcuNzE0OCAxMi45MTg4IDI1Ljc1IDE1LjU0MSAyNC4yODU3QzE4LjEyNzggMjIuODQxMSAyMC42MDUgMjAuMjExNyAyOC40NjMgMjIuNjY0M0M0NS4xNjAxIDI3Ljg3NTEgNjEuNzIxOSA1NS45OTk5IDM0LjI0MjIgNTUuOTk5OUMyNS4yMDI4IDU1Ljk5OTkgMTIuOTQwOSA1NC41NzAxIDUuNzU0MDIgNDYuOTQ0NUMzLjg4NjMxIDQ0Ljk2MjggMy4wOTY5MiA0NC4wODYzIDMuMDk2OTIgNDAuNDcwNUMzLjA5NjkyIDM2Ljg1NDYgNi4wMjM3MyAzNi42MDwtNy4xNzExNCAzNi42MDcxIiBzdHJva2U9IjFBMUExQSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxNS4xODY0IiBjeT0iMzMuMzA5NyIgcj0iMC45NTgxNjYiIHRyYW5zZm9ybT0icm90YXRlKDEwIDE1LjE4NjQgMzMuMzA5NykiIGZpbGw9IiMxQTFBMUEiLz4KPGNpcmNsZSBjeD0iMjQuNzY3OSIgY3k9IjM1LjIyNTciIHI9IjAuOTU4MTY2IiB0cmFuc2Zvcm09InJvdGF0ZSgxMCAyNC43Njc5IDM1LjIyNTcpIiBmaWxsPSIjMUExQTFBIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjMuNjExOCAxNy4zNjRMMjQuMzUwMyAxNy4yMzNDMjQuMjg3IDE2Ljg3NjIgMjMuOTc3NiAxNi42MTU2IDIzLjYxNTIgMTYuNjE0TDIzLjYxMTggMTcuMzY0Wk0xMi4zOTY5IDExLjI4OTVMMTMuMDI0NyAxMC44NzkzSDEzLjAyNDdMMTIuMzk2OSAxMS4yODk1Wk0xMy4wOTY4IDguODk4M0wxMi43NTY0IDguMjI5OTlIMTIuNzU2NEwxMy4wOTY4IDguODk4M1pNMjYuMzA1OCAxMy4zNTc1TDI1LjU5NjQgMTMuNjAwOUwyNi4zMDU4IDE0LjEwNzVDMjcuMDE1MiAxMy42MDA5TDI2LjMwNTggMTMuMzU3NVpNMzkuNTE0OCA4Ljg5ODNMMzkuMTc0NCA5LjU2NjYxVjkuNTY2NjFMMzkuNTE0OCA4Ljg5ODNaTTQwLjIxNDcgMTEuMjg5NUwzOS41ODY4IDEwLjguNzkzVjEwLjg3OTNMMTQuMjE0NyAxMS4yODk1Wk0yNy4zNTcyIDE3LjI4MzZMMjcuNDMyNSAxNi41Mzc0TDI2Ljg0NDggMTYuNzM2TDI2LjYwNzcgMTcuMzA5M0wyNy4zNTcyIDE3LjI4MzZMMjcuNTI0NyAyMi4xNjAzTDI4LjI3NDIgMjIuMTM0NlYyMi4xMzQ2TDI3LjUyNDcgMjIuMTYwM1pNMjQuNTE4NCAyMi40NzY5TDIzLjc4IDIyLjYwNzhMMjQuNTE4NCAyMi40NzY5WiIgZmlsbD0iIzFBMUExQSIvPgo8L3N2Zz4=',
    thinking: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNTgiIHZpZXdCb3g9IjAgMCA1MiA1OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTUuMTg2NCIgY3k9IjMzLjMwOTciIHI9IjAuOTU4MTY2IiB0cmFuc2Zvcm09InJvdGF0ZSgxMCAxNS4xODY0IDMzLjMwOTcpIiBmaWxsPSIjMUExQTFBIi8+CjxwYXRoIGQ9Ik0yNy42NzkxIDEzLjg4ODZMMjMuMzU4OSAxNC4zMzhDMjMuMjE0OSAxMy41ODg5IDIzLjI0MzkgMTEuOTEwOSAyMi43NTQxIDExLjE5MTdDMjIuMTQxOCAxMC4yOTI3IDE5LjkwMjggOS44NDMyNCAxOS45MDI4IDguMDQ1MzJDMTkuOTAyOCA2LjI0NzQgMjIuMDYyOSA0IDI0Ljg0NTMgNEMyNy42Mjc3IDQgMzAuMjcxMSA1LjM0ODQ0IDMwLjI3MTEgNy4xNDYzNkMzMC4yNzExIDguOTQ0MjggMjguMTExMSA5LjgyMzI0IDI3LjY3OTEgMTAuNzQyMkMyNy4zMzM1IDExLjQ2MTQgMjcuNjc5MSAxMy4wNjI4IDI3LjY3OTEgMTMuODg4NloiIGZpbGw9IiNGRkUwNTQiIHN0cm9rZT0iI0U0OTgxRiIgc3Ryb2tlLXdpZHRoPSIxLjI5NjA0Ii8+PC9zdmc+',
    home: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTA1IiBoZWlnaHQ9IjYyIiB2aWV3Qm94PSIwIDAgMTA1IDYyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNNTQuMDQ4NiA0LjUwNDg4QzUzLjc5MTYgMTQuMzkzNiA1NC41MzU0IDIwLjcxMDUgNTUuNzA2OCAyOS4xODI2TDU2LjIzNDEgMzIuOTY1OEM1Ni4zOTY0IDM0LjM0NTYgNTYuOTQ2IDQxLjM3MzkgNTcuNDQzMSA0OC4xMjRDNTcuNjkyMSA1MS41MDUzIDU3LjkyNzUgNTQuODA1OCA1OC4wOTI1IDU3LjI2OTVDNTguMTc1IDU4LjUwMTUgNTguMjM5NyA1OS41MjIgNTguMjggNjAuMjM4M0M1OC4yODU0IDYwLjMzMzggNTguMjg5MiA2MC40MjQgNTguMjkzNyA2MC41MDc4SDUxLjI3NDJDNTEuMTk3IDU4LjI2MyA1MC45MTMzIDU2LjA1ODYgNTAuNzMwMiA1My45MDA0VjUzLjg5ODRMNDkuNDYyNiAzOS4zMTc0QzQ5LjMxMzggMzcuNDkzNiA0OC45NzUyIDM0LjQ0NDEgNDkuMDAyNyAzMi44OTQ1VjMyLjg2OTFMNDkuMDAxNyAzMi44NDI4QzQ4Ljc1NzcgMjcuMjY5NiA0OC4yMTYyIDIzLjUzOTcgNDcuNjc1NSAxOS41MzYxQzQ3LjEzNyAxNS41NDggNDYuNTk0NCAxMS4yNjUzIDQ2LjMzMzcgNC41NDAwNEM0Ni4zMjU4IDMuNTQwMTMgNDYuMzI4MSAyLjQ3MTcgNDYuMzA1NCAxLjQzNzVDNDYuNTU0NSAxLjMwMDYxIDQ2LjY5NDEgMS4xNzQ1OSA0Ny4wMzg4IDEuMDcxMjlCNDcuNDE4OCAwLjkxMDg3OCA0Ny43NDU3IDAuODMyNTQ1IDQ4LjAzNjkgMC44NDI3NzNDNDkuOTc5MyAwLjkxMTIzOSA1MS44NTYzIDAuOTgwMTY1IDUzLjgxODEgMC45Mzc1QzUzLjkzMTggMi4xMzIyOSA1NC4wNDUyIDMuNDIxODkgNTQuMDQ4NiA0LjUwNDg4WiIgZmlsbD0iI0RDQUI2RSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjY4MzU5Ii8+CjxwYXRoIGQ9Ik0xNC4yMjc3IDUuODg2MjNIOTAuMTg2VjMxLjcwMTNIMTQuMjI3N1Y1Ljg4NjIzWiIgZmlsbD0iI0RDQUI2RSIvPgo8L3N2Zz4=',
    toolbar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHZpZXdCb3g9IjAgMCA1MiA1OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMxLjQ4MzYgNDIuNzE1NUMyNy4xNzE0IDQwLjAyNDEgMjEuMzA0IDM5LjkzMzggMTYuNTM3NCAzOC45NTY1QzEzLjcwODkgMzguMzc2NSAxMC42MDQgMzYuNjA3MSA3Ljc2ODk5IDM2LjYwNzFDNS4wODg5IDM2LjYwNzEgNy44NzMzIDMwLjc3NjkgOC42NzY4MyAyOS45MjQzQzEwLjc1OTIgMjcuNzE0OCAxMi45MTg4IDI1Ljc1IDE1LjU0MSAyNC4yODU3QzE4LjEyNzggMjIuODQxMSAyMC42MDUgMjAuMjExNyAyOC40NjMgMjIuNjY0M0M0NS4xNjAxIDI3Ljg3NTEgNjEuNzIxOSA1NS45OTk5IDM0LjI0MjIgNTUuOTk5OUMyNS4yMDI4IDU1Ljk5OTkgMTIuOTQwOSA1NC41NzAxIDUuNzU0MDIgNDYuOTQ0NUMzLjg4NjMxIDQ0Ljk2MjggMy4wOTY5MiA0NC4wODYzIDMuMDk2OTIgNDAuNDcwNUMzLjA5NjkyIDM2Ljg1NDYgNi4wMjM3MyAzNi42MDcxIDcuMTcxMTQgMzYuNjA3MSIgc3Ryb2tlPSIjMUExQTFBIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjMuNjExOCAxNy4zNjRDMjMuNjExOCAxNy4zNjQgMTcuODY0OSAxNy4zMzgzIDE0LjE3IDE0LjAwMzRMMTIuMzk2OSAxMS4yODk1TDEzLjA5NjggOC44OTgzQzIwLjk4OTYgNC44NzgzNyAyNC44MDIyIDguOTc1NzUgMjYuMzA1OCAxMy4zNTc1QzI3LjgwOTMgOC45NzU3NSAzMS42MjIgNC44NzgzNyAzOS41MTQ4IDguODk4M0w0MC4yMTQ3IDExLjI4OTVMMjcuMzU3MiAxNy4yODM2TDI3LjUyNDcgMjIuMTYwM0wyNC41MTg0IDIyLjQ3NjlMMjMuNjExOCAxNy4zNjRaIiBmaWxsPSIjMUExQTFBIi8+Cjwvc3ZnPg=='
  };

  // Inject CSS
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  function injectToolbarButton() {
    const toolbarWrapper = document.querySelector('[data-testid="design-toolbelt-wrapper"]');
    if (!toolbarWrapper || toolbarWrapper.querySelector('.figpal-toolbar-btn')) return;

    const toolbarBtn = document.createElement('button');
    toolbarBtn.className = 'figpal-toolbar-btn';
    toolbarBtn.innerHTML = ASSETS.toolbar;
    toolbarBtn.title = 'DS Guardian (Alt+D)';

    // Insert into the enabled tools row if possible, otherwise use the wrapper
    const targetRow = toolbarWrapper.querySelector('[class*="enabledToolsRow"]') || toolbarWrapper.querySelector('div[class*="toolbelt--toolbelt--"]') || toolbarWrapper;

    const groups = targetRow.querySelectorAll('.tool_group--toolGroup--dSfxx');
    if (groups.length > 0) {
      targetRow.insertBefore(toolbarBtn, groups[groups.length - 1]);
    } else {
      targetRow.appendChild(toolbarBtn);
    }

    toolbarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      let panel = document.getElementById('figpal-panel-hub');
      if (!panel) {
        // Simple injection for desktop-inject standalone
        panel = document.createElement('div');
        panel.id = 'figpal-panel-hub';
        panel.className = 'figpal-panel-container';
        panel.innerHTML = `
          <div class="figpal-panel-header">
            <h3>Figpals Hub (Desktop)</h3>
            <button class="figpal-panel-close">×</button>
          </div>
          <div class="figpal-panel-body">Empty Hub</div>
        `;
        document.body.appendChild(panel);
        panel.querySelector('.figpal-panel-close').addEventListener('click', () => {
          panel.classList.remove('visible');
          updateToolbarBtnState();
        });
      }

      panel.classList.toggle('visible');
      updateToolbarBtnState();
    });

    updateToolbarBtnState();
  }

  function updateToolbarBtnState() {
    const toolbarBtn = document.querySelector('.figpal-toolbar-btn');
    const panel = document.getElementById('figpal-panel-hub');
    if (!toolbarBtn) return;

    if (panel && panel.classList.contains('visible')) {
      toolbarBtn.classList.add('selected');
    } else {
      toolbarBtn.classList.remove('selected');
    }
  }

  function inject() {
    // 1. Inject Container and Chat (Done once)
    if (!document.getElementById('figpal-container')) {
      const container = document.createElement('div');
      container.id = 'figpal-container';
      container.classList.add('resting');

      const home = document.createElement('img');
      home.id = 'figpal-home';
      home.src = ASSETS.home;

      const follower = document.createElement('img');
      follower.id = 'figpal-follower';
      follower.src = ASSETS.selection;

      const chatBubble = document.createElement('div');
      chatBubble.id = 'figpal-chat-bubble';
      chatBubble.innerHTML = `
        <div class="figpal-chat-header">
          <span>DS Guardian</span>
          <button class="figpal-close-btn">×</button>
        </div>
        <div class="figpal-chat-content">
          <div class="figpal-message-row bot">
             <img src="${ASSETS.selection}" class="figpal-avatar" />
             <div class="figpal-message bot">Hello! How can I help you design today?</div>
          </div>
          <div class="figpal-quick-actions">
            <div class="figpal-quick-action-btn">Compare component against codebase</div>
            <div class="figpal-quick-action-btn">Check component for design token usage</div>
          </div>
        </div>
        <div class="figpal-chat-input-area">
          <input type="text" placeholder="Ask me anything..." />
        </div>
        <div class="figpal-resizer top"></div><div class="figpal-resizer top-left"></div><div class="figpal-resizer top-right"></div>
        <div class="figpal-resizer left"></div><div class="figpal-resizer right"></div>
        <div class="figpal-resizer bottom-left"></div><div class="figpal-resizer bottom-right"></div>
        <div class="figpal-resizer bottom-right"></div>
      
      <!-- Auth Modal -->
      <div id="figpal-auth-modal" style="display: none;">
        <div class="figpal-auth-content">
            <h3>Connect Brain 🧠</h3>
            <p>The plugin needs your API Key to think.</p>
            
            <label>Provider</label>
            <select id="figpal-auth-provider">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="xai">xAI (Grok)</option>
            </select>
            
            <label>API Key</label>
            <input type="password" id="figpal-auth-key" placeholder="sk-..." />
            
            <button id="figpal-auth-save">Connect</button>
        </div>
      </div>
    `;

      document.body.appendChild(container);
      document.body.appendChild(home);
      container.appendChild(follower);
      container.appendChild(chatBubble);

      // Core logic (following, dragging, resizing) - Only run once
      setupCoreLogic(container, follower, chatBubble);

      // Sync toolbar state when container changes
      const observer = new MutationObserver(() => updateToolbarBtnState());
      observer.observe(container, { attributes: true, attributeFilter: ['class'] });
    }

    // 2. Inject Toolbar Button (Done whenever missing)
    injectToolbarButton();
  }

  function setupCoreLogic(container, follower, chatBubble) {
    let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0, isFollowing = false;
    const speed = 0.12;

    follower.addEventListener('click', (e) => {
      e.stopPropagation();
      isFollowing = true;
      container.classList.remove('resting');
    });

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      const restingX = window.innerWidth / 2 + 180;
      const restingY = window.innerHeight - 80;

      if (isFollowing && !container.classList.contains('chat-visible')) {
        currentX += (mouseX + 28 - currentX) * speed;
        currentY += (mouseY + 28 - currentY) * speed;
        container.style.left = currentX + 'px';
        container.style.top = currentY + 'px';
      } else if (!container.classList.contains('resting')) {
        currentX += (restingX - currentX) * speed;
        currentY += (restingY - currentY) * speed;
        container.style.left = currentX + 'px';
        container.style.top = currentY + 'px';
        if (Math.abs(currentX - restingX) < 1 && Math.abs(currentY - restingY) < 1) {
          container.classList.add('resting');
        }
      }
      requestAnimationFrame(animate);
    }
    animate();

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        container.classList.remove('chat-visible');
        isFollowing = false;
      }
      if (e.code === 'KeyD' && e.altKey) {
        container.classList.toggle('chat-visible');
      }
    });

    const closeBtn = chatBubble.querySelector('.figpal-close-btn');
    closeBtn.addEventListener('click', () => container.classList.remove('chat-visible'));

    console.log('DS Guardian: Injected into Figma Desktop!');
  }

  // Persistent poll for Figma editor and toolbar
  // Disabling standalone injector in favour of modular injector.js
  /*
  setInterval(() => {
    if (document.querySelector('[data-testid="design-toolbelt-wrapper"]')) {
      inject();
    }
  }, 1000);
  */
})();
