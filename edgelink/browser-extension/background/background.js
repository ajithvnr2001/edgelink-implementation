/**
 * EdgeLink Extension - Background Service Worker
 * Handles context menus, keyboard shortcuts, and background tasks
 */

// Context menu IDs
const CONTEXT_MENU_IDS = {
  SHORTEN_PAGE: 'shorten-current-page',
  SHORTEN_LINK: 'shorten-link',
  SHORTEN_SELECTION: 'shorten-selection',
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('EdgeLink extension installed');

  // Create context menus
  createContextMenus();

  // Set default settings
  await setDefaultSettings();
});

/**
 * Create context menus
 */
function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Shorten current page URL
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SHORTEN_PAGE,
      title: 'Shorten this page',
      contexts: ['page'],
    });

    // Shorten a link
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SHORTEN_LINK,
      title: 'Shorten this link',
      contexts: ['link'],
    });

    // Shorten selected text (if it's a URL)
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SHORTEN_SELECTION,
      title: 'Shorten selected URL',
      contexts: ['selection'],
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let urlToShorten = null;

  switch (info.menuItemId) {
    case CONTEXT_MENU_IDS.SHORTEN_PAGE:
      urlToShorten = info.pageUrl;
      break;

    case CONTEXT_MENU_IDS.SHORTEN_LINK:
      urlToShorten = info.linkUrl;
      break;

    case CONTEXT_MENU_IDS.SHORTEN_SELECTION:
      const selection = info.selectionText.trim();
      if (isValidURL(selection)) {
        urlToShorten = selection;
      }
      break;
  }

  if (urlToShorten) {
    await shortenURLInBackground(urlToShorten, tab);
  }
});

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'shorten-current-url') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      await shortenURLInBackground(tabs[0].url, tabs[0]);
    }
  }
});

/**
 * Shorten URL in background and show notification
 */
async function shortenURLInBackground(url, tab) {
  try {
    // Get API settings
    const settings = await chrome.storage.local.get(['authToken', 'apiBaseUrl']);
    const apiBaseUrl = settings.apiBaseUrl || 'https://edgelink.io';
    const token = settings.authToken;

    // Show loading notification
    showNotification('EdgeLink', 'Shortening URL...', 'loading');

    // Make API request
    const response = await fetch(`${apiBaseUrl}/api/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to shorten URL');
    }

    // Copy to clipboard
    await copyToClipboard(data.short_url);

    // Show success notification with copy confirmation
    showNotification(
      'EdgeLink - Link Shortened!',
      `${data.short_url}\n\nCopied to clipboard! Click to open.`,
      'success',
      data.short_url
    );

    // Send message to content script to show inline notification
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'LINK_SHORTENED',
        data: {
          shortUrl: data.short_url,
          originalUrl: url,
        },
      }).catch(() => {
        // Ignore errors if content script not ready
      });
    }
  } catch (error) {
    console.error('Failed to shorten URL:', error);
    showNotification('EdgeLink - Error', error.message, 'error');
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    // Use offscreen document for clipboard access in service worker
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback: try injecting a content script to copy
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'COPY_TO_CLIPBOARD',
          text,
        });
      }
    } catch (e) {
      console.error('Fallback copy also failed:', e);
    }
  }
}

/**
 * Show browser notification
 */
function showNotification(title, message, type = 'info', url = null) {
  const iconMap = {
    loading: 'icons/icon-128.png',
    success: 'icons/icon-128.png',
    error: 'icons/icon-128.png',
    info: 'icons/icon-128.png',
  };

  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconMap[type],
    title,
    message,
    priority: 2,
  }, (notificationId) => {
    if (url) {
      // Store URL for notification click handler
      chrome.storage.session.set({ [`notification_${notificationId}`]: url });

      // Auto-clear notification after 5 seconds
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 5000);
    }
  });
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Get stored URL for this notification
  const result = await chrome.storage.session.get(`notification_${notificationId}`);
  const url = result[`notification_${notificationId}`];

  if (url) {
    chrome.tabs.create({ url });
    chrome.notifications.clear(notificationId);
    chrome.storage.session.remove(`notification_${notificationId}`);
  }
});

/**
 * Set default settings
 */
async function setDefaultSettings() {
  const result = await chrome.storage.local.get(['apiBaseUrl', 'autoShorten', 'showInlineNotification']);

  if (!result.apiBaseUrl) {
    await chrome.storage.local.set({ apiBaseUrl: 'https://edgelink.io' });
  }

  if (result.autoShorten === undefined) {
    await chrome.storage.local.set({ autoShorten: false });
  }

  if (result.showInlineNotification === undefined) {
    await chrome.storage.local.set({ showInlineNotification: true });
  }
}

/**
 * Listen for messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHORTEN_URL') {
    shortenURLInBackground(message.url, sender.tab).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(null).then((settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set(message.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Utility: Validate URL
 */
function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener((tab) => {
  // This is not used because we have a popup
  // But keeping for reference
  console.log('Extension icon clicked');
});

console.log('EdgeLink background service worker initialized');
