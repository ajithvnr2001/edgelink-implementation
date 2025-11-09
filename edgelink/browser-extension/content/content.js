/**
 * EdgeLink Extension - Content Script
 * Runs on all pages to handle inline notifications and page interactions
 */

// Track if notification is already shown
let notificationShown = false;

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LINK_SHORTENED') {
    showInlineNotification(message.data);
    sendResponse({ success: true });
  }

  if (message.type === 'COPY_TO_CLIPBOARD') {
    copyToClipboard(message.text);
    sendResponse({ success: true });
  }

  return true;
});

/**
 * Show inline notification on the page
 */
async function showInlineNotification(data) {
  // Check if inline notifications are enabled
  const settings = await chrome.storage.local.get(['showInlineNotification']);
  if (settings.showInlineNotification === false) {
    return;
  }

  // Prevent duplicate notifications
  if (notificationShown) {
    return;
  }
  notificationShown = true;

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'edgelink-notification';
  notification.innerHTML = `
    <div class="edgelink-notification-content">
      <div class="edgelink-notification-icon">✓</div>
      <div class="edgelink-notification-text">
        <strong>Link Shortened!</strong>
        <div class="edgelink-notification-url">${data.shortUrl}</div>
        <div class="edgelink-notification-actions">
          <button id="edgelink-copy-btn">Copy</button>
          <button id="edgelink-open-btn">Open</button>
        </div>
      </div>
      <button class="edgelink-notification-close">×</button>
    </div>
  `;

  // Add styles
  injectStyles();

  // Add to page
  document.body.appendChild(notification);

  // Setup event listeners
  setupNotificationListeners(notification, data);

  // Auto-hide after 8 seconds
  setTimeout(() => {
    hideNotification(notification);
  }, 8000);
}

/**
 * Setup notification event listeners
 */
function setupNotificationListeners(notification, data) {
  // Close button
  const closeBtn = notification.querySelector('.edgelink-notification-close');
  closeBtn.addEventListener('click', () => {
    hideNotification(notification);
  });

  // Copy button
  const copyBtn = notification.querySelector('#edgelink-copy-btn');
  copyBtn.addEventListener('click', async () => {
    await copyToClipboard(data.shortUrl);
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#10B981';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.style.background = '';
    }, 2000);
  });

  // Open button
  const openBtn = notification.querySelector('#edgelink-open-btn');
  openBtn.addEventListener('click', () => {
    window.open(data.shortUrl, '_blank');
    hideNotification(notification);
  });
}

/**
 * Hide notification
 */
function hideNotification(notification) {
  notification.style.animation = 'edgelink-slideOut 0.3s ease-out';
  setTimeout(() => {
    notification.remove();
    notificationShown = false;
  }, 300);
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy:', error);
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Inject notification styles
 */
function injectStyles() {
  if (document.getElementById('edgelink-notification-styles')) {
    return;
  }

  const styles = document.createElement('style');
  styles.id = 'edgelink-notification-styles';
  styles.textContent = `
    @keyframes edgelink-slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes edgelink-slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    #edgelink-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: edgelink-slideIn 0.3s ease-out;
    }

    .edgelink-notification-content {
      background: #1F2937;
      color: #F9FAFB;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      min-width: 320px;
      max-width: 400px;
      border: 1px solid #374151;
    }

    .edgelink-notification-icon {
      width: 32px;
      height: 32px;
      background: #10B981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .edgelink-notification-text {
      flex: 1;
      font-size: 14px;
    }

    .edgelink-notification-text strong {
      display: block;
      margin-bottom: 8px;
      font-size: 15px;
    }

    .edgelink-notification-url {
      background: #111827;
      padding: 8px 10px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #3B82F6;
      margin-bottom: 10px;
      word-break: break-all;
    }

    .edgelink-notification-actions {
      display: flex;
      gap: 8px;
    }

    .edgelink-notification-actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: #374151;
      color: #F9FAFB;
    }

    .edgelink-notification-actions button:hover {
      background: #4B5563;
    }

    .edgelink-notification-close {
      background: none;
      border: none;
      color: #9CA3AF;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      line-height: 1;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .edgelink-notification-close:hover {
      color: #F9FAFB;
    }
  `;

  document.head.appendChild(styles);
}

console.log('EdgeLink content script loaded');
