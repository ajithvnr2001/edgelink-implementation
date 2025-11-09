/**
 * EdgeLink Extension - Popup Script
 * Handles the popup UI interactions and link shortening
 */

let currentTab = null;
let recentLinks = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
const loadingOverlay = document.getElementById('loading-overlay');

// Auth elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

// Main elements
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const userPlan = document.getElementById('user-plan');
const urlInput = document.getElementById('url-input');
const customSlugInput = document.getElementById('custom-slug');
const slugSuggestions = document.getElementById('slug-suggestions');
const resultSection = document.getElementById('result-section');
const shortUrlInput = document.getElementById('short-url');
const recentLinksContainer = document.getElementById('recent-links');
const mainError = document.getElementById('main-error');

/**
 * Initialize popup
 */
async function init() {
  await api.init();

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Check authentication state
  if (api.isAuthenticated()) {
    await showMainView();
  } else {
    showAuthView();
  }

  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Auth tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  // Auth actions
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('signup-btn').addEventListener('click', handleSignup);
  document.getElementById('use-anonymous-btn').addEventListener('click', handleAnonymous);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Main actions
  document.getElementById('get-current-btn').addEventListener('click', getCurrentTabURL);
  document.getElementById('shorten-btn').addEventListener('click', handleShorten);
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  document.getElementById('open-link-btn').addEventListener('click', openShortLink);
  document.getElementById('view-analytics-btn').addEventListener('click', viewAnalytics);
  document.getElementById('create-another-btn').addEventListener('click', createAnother);
  document.getElementById('refresh-links-btn').addEventListener('click', loadRecentLinks);
  document.getElementById('view-all-links-btn').addEventListener('click', viewAllLinks);
  document.getElementById('settings-btn').addEventListener('click', openSettings);

  // URL input change - generate suggestions
  urlInput.addEventListener('input', debounce(handleURLInput, 500));

  // Enter key handlers
  document.getElementById('login-email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('signup-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSignup();
  });
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleShorten();
  });
}

/**
 * Switch auth tabs
 */
function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.toggle('active', form.id === `${tab}-form`);
  });
  hideError(authError);
}

/**
 * Handle login
 */
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError(authError, 'Please enter email and password');
    return;
  }

  showLoading();
  try {
    await api.login(email, password);
    await showMainView();
  } catch (error) {
    showError(authError, error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Handle signup
 */
async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!email || !password) {
    showError(authError, 'Please enter email and password');
    return;
  }

  showLoading();
  try {
    await api.signup(email, password, name);
    await showMainView();
  } catch (error) {
    showError(authError, error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Handle anonymous mode
 */
function handleAnonymous() {
  showMainView();
}

/**
 * Handle logout
 */
async function handleLogout() {
  await api.logout();
  showAuthView();
}

/**
 * Show auth view
 */
function showAuthView() {
  authView.classList.remove('hidden');
  mainView.classList.add('hidden');
  hideError(authError);
}

/**
 * Show main view
 */
async function showMainView() {
  authView.classList.add('hidden');
  mainView.classList.remove('hidden');

  if (api.isAuthenticated()) {
    userInfo.classList.remove('hidden');
    try {
      const profile = await api.getProfile();
      userEmail.textContent = profile.email;
      userPlan.textContent = profile.plan.toUpperCase();
      userPlan.style.background = profile.plan === 'pro' ? '#10B981' : '#6B7280';
    } catch (error) {
      console.error('Failed to load profile:', error);
      userInfo.classList.add('hidden');
    }

    await loadRecentLinks();
  } else {
    userInfo.classList.add('hidden');
  }

  // Set current tab URL if it's a valid URL
  if (currentTab && currentTab.url && isValidURL(currentTab.url)) {
    urlInput.value = currentTab.url;
    await handleURLInput();
  }
}

/**
 * Get current tab URL
 */
async function getCurrentTabURL() {
  if (currentTab && currentTab.url) {
    urlInput.value = currentTab.url;
    await handleURLInput();
  }
}

/**
 * Handle URL input - generate slug suggestions
 */
async function handleURLInput() {
  const url = urlInput.value.trim();

  if (!url || !isValidURL(url)) {
    slugSuggestions.innerHTML = '';
    return;
  }

  try {
    const result = await api.suggestSlug(url);
    displaySlugSuggestions(result.suggestions || []);
  } catch (error) {
    console.error('Failed to generate slug suggestions:', error);
    slugSuggestions.innerHTML = '';
  }
}

/**
 * Display slug suggestions
 */
function displaySlugSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    slugSuggestions.innerHTML = '';
    return;
  }

  slugSuggestions.innerHTML = suggestions.slice(0, 5).map(slug =>
    `<div class="slug-chip" data-slug="${slug}">${slug}</div>`
  ).join('');

  // Add click handlers
  document.querySelectorAll('.slug-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      customSlugInput.value = chip.dataset.slug;
    });
  });
}

/**
 * Handle URL shortening
 */
async function handleShorten() {
  const url = urlInput.value.trim();
  const customSlug = customSlugInput.value.trim();
  const utmTemplate = document.getElementById('utm-template').value.trim();
  const password = document.getElementById('password').value;
  const expiresAt = document.getElementById('expires-at').value;

  if (!url) {
    showError(mainError, 'Please enter a URL');
    return;
  }

  if (!isValidURL(url)) {
    showError(mainError, 'Please enter a valid URL');
    return;
  }

  showLoading();
  hideError(mainError);

  try {
    const result = await api.shortenURL(url, {
      customSlug,
      utmTemplate,
      password,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    displayResult(result);

    if (api.isAuthenticated()) {
      await loadRecentLinks();
    }
  } catch (error) {
    showError(mainError, error.message);
  } finally {
    hideLoading();
  }
}

/**
 * Display shortening result
 */
function displayResult(result) {
  shortUrlInput.value = result.short_url;
  resultSection.classList.remove('hidden');

  // Store for quick actions
  resultSection.dataset.slug = result.slug;
  resultSection.dataset.url = result.short_url;
}

/**
 * Copy to clipboard
 */
async function copyToClipboard() {
  const url = shortUrlInput.value;

  try {
    await navigator.clipboard.writeText(url);

    // Visual feedback
    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓';
    copyBtn.style.color = '#10B981';

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.color = '';
    }, 2000);
  } catch (error) {
    showError(mainError, 'Failed to copy to clipboard');
  }
}

/**
 * Open short link
 */
function openShortLink() {
  const url = resultSection.dataset.url;
  chrome.tabs.create({ url });
}

/**
 * View analytics
 */
function viewAnalytics() {
  const slug = resultSection.dataset.slug;
  // Open dashboard analytics page
  chrome.tabs.create({ url: `${api.baseURL}/analytics/${slug}` });
}

/**
 * Create another link
 */
function createAnother() {
  urlInput.value = '';
  customSlugInput.value = '';
  document.getElementById('utm-template').value = '';
  document.getElementById('password').value = '';
  document.getElementById('expires-at').value = '';
  slugSuggestions.innerHTML = '';
  resultSection.classList.add('hidden');
  hideError(mainError);
  urlInput.focus();
}

/**
 * Load recent links
 */
async function loadRecentLinks() {
  if (!api.isAuthenticated()) {
    recentLinksContainer.innerHTML = '<div class="loading">Login to view recent links</div>';
    return;
  }

  recentLinksContainer.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const result = await api.getLinks(1, 5);
    recentLinks = result.links || [];
    displayRecentLinks();
  } catch (error) {
    recentLinksContainer.innerHTML = '<div class="loading">Failed to load links</div>';
  }
}

/**
 * Display recent links
 */
function displayRecentLinks() {
  if (recentLinks.length === 0) {
    recentLinksContainer.innerHTML = '<div class="loading">No recent links</div>';
    return;
  }

  recentLinksContainer.innerHTML = recentLinks.map(link => `
    <div class="link-item">
      <div class="link-info">
        <div class="link-slug" title="${link.slug}">${link.slug}</div>
        <div class="link-destination" title="${link.destination}">${link.destination}</div>
        <div class="link-stats">${link.click_count || 0} clicks</div>
      </div>
      <div class="link-actions">
        <button class="icon-btn" onclick="copyLinkURL('${link.slug}')" title="Copy">📋</button>
        <button class="icon-btn" onclick="openLink('${link.slug}')" title="Open">🔗</button>
      </div>
    </div>
  `).join('');
}

/**
 * Copy link URL
 */
window.copyLinkURL = async function(slug) {
  const url = `${api.baseURL}/${slug}`;
  await navigator.clipboard.writeText(url);
};

/**
 * Open link
 */
window.openLink = function(slug) {
  const url = `${api.baseURL}/${slug}`;
  chrome.tabs.create({ url });
};

/**
 * View all links
 */
function viewAllLinks() {
  chrome.tabs.create({ url: `${api.baseURL}/dashboard` });
}

/**
 * Open settings
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Utility: Show error
 */
function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => hideError(element), 5000);
}

/**
 * Utility: Hide error
 */
function hideError(element) {
  element.classList.remove('show');
}

/**
 * Utility: Show loading
 */
function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

/**
 * Utility: Hide loading
 */
function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

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
 * Utility: Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize popup
init();
