# EdgeLink Browser Extension

Fast, powerful URL shortener extension for Chrome and Firefox. Shorten links instantly from any page with a single click.

## 🚀 Features

- **Instant URL Shortening**: Shorten the current page or any link with one click
- **Context Menu Integration**: Right-click any link or selected URL to shorten
- **Keyboard Shortcuts**: Use `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) to shorten current page
- **Smart Slug Suggestions**: AI-powered slug suggestions based on page content
- **Recent Links**: View and manage your recent shortened links
- **Authentication**: Login with your EdgeLink account for full features
- **Anonymous Mode**: Shorten links without signing in
- **Inline Notifications**: See confirmation right on the page
- **Auto-copy**: Shortened links automatically copied to clipboard
- **Dark Theme**: Beautiful dark UI optimized for any lighting
- **Cross-browser**: Compatible with Chrome and Firefox

## 📦 Installation

### Chrome

1. Download the extension or clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `browser-extension` folder
5. The EdgeLink icon will appear in your toolbar

### Firefox

1. Download the extension or clone the repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `browser-extension` folder
5. The EdgeLink icon will appear in your toolbar

**Note**: For permanent Firefox installation, the extension needs to be signed and distributed through Mozilla Add-ons.

## 🎯 Usage

### Shorten Current Page

**Method 1**: Click the EdgeLink icon in your toolbar
**Method 2**: Right-click anywhere on the page and select "Shorten this page"
**Method 3**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)

### Shorten Any Link

**Method 1**: Right-click any link and select "Shorten this link"
**Method 2**: Select a URL text, right-click, and select "Shorten selected URL"

### Advanced Options

1. Click the EdgeLink icon
2. Enter your URL
3. Click "Advanced Options" to configure:
   - Custom slug
   - UTM parameters
   - Password protection
   - Expiration date

## 🔐 Authentication

### Login

1. Click the EdgeLink icon
2. Click the "Login" tab
3. Enter your email and password
4. Click "Login"

### Signup

1. Click the EdgeLink icon
2. Click the "Sign Up" tab
3. Enter your details
4. Click "Sign Up"

### Anonymous Mode

Click "Continue as Guest" to use the extension without an account. Anonymous links expire after 30 days.

## ⚙️ Settings

Access settings by:
1. Right-click the EdgeLink icon
2. Select "Options"

Or:
1. Go to `chrome://extensions/` (Chrome) or `about:addons` (Firefox)
2. Find EdgeLink and click "Options"

### Available Settings

- **API Base URL**: Configure custom EdgeLink instance
- **Auto-copy**: Automatically copy shortened links to clipboard
- **Inline Notifications**: Show/hide on-page notifications
- **Default UTM Parameters**: Pre-fill UTM parameters for all links
- **Default Custom Domain**: Use your custom domain by default (Pro only)
- **Recent Links Limit**: Number of recent links to show in popup

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` (Windows/Linux) | Shorten current page URL |
| `Cmd+Shift+S` (Mac) | Shorten current page URL |

To customize shortcuts:
- **Chrome**: Go to `chrome://extensions/shortcuts`
- **Firefox**: Go to `about:addons` → Manage Extension → Keyboard Shortcuts

## 🎨 Screenshots

### Popup Interface
- Clean, modern dark theme
- AI-powered slug suggestions
- Recent links list
- Advanced options

### Context Menu
- Shorten current page
- Shorten any link
- Shorten selected URL

### Settings Page
- Comprehensive configuration options
- API settings
- Authentication status
- Behavior preferences

## 🛠️ Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension manifest (v3)
├── icons/                 # Extension icons
├── popup/                 # Popup interface
│   ├── popup.html        # Popup HTML
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── background/            # Background service worker
│   └── background.js     # Context menus, shortcuts
├── content/               # Content scripts
│   └── content.js        # Page-level integration
├── options/               # Settings page
│   ├── options.html      # Settings HTML
│   ├── options.css       # Settings styles
│   └── options.js        # Settings logic
└── lib/                   # Shared libraries
    └── api.js            # API client
```

### Local Development

1. Clone the repository
```bash
git clone https://github.com/yourusername/edgelink.git
cd edgelink/browser-extension
```

2. Make your changes

3. Reload the extension:
   - **Chrome**: Go to `chrome://extensions/` and click the reload icon
   - **Firefox**: Go to `about:debugging` and click "Reload"

### API Client

The extension communicates with the EdgeLink backend via the API client (`lib/api.js`).

**Key Methods**:
- `shortenURL(url, options)`: Shorten a URL
- `getLinks(page, limit)`: Get user's links
- `login(email, password)`: Authenticate user
- `suggestSlug(url)`: Get slug suggestions

## 🔗 Links

- **Website**: [edgelink.io](https://edgelink.io)
- **Dashboard**: [edgelink.io/dashboard](https://edgelink.io/dashboard)
- **API Documentation**: [edgelink.io/docs](https://edgelink.io/docs)
- **Support**: [edgelink.io/support](https://edgelink.io/support)

## 📄 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@edgelink.io or visit [edgelink.io/support](https://edgelink.io/support)

## 📝 Changelog

### Version 1.0.0 (November 2025)

- Initial release
- URL shortening from any page
- Context menu integration
- Keyboard shortcuts
- AI slug suggestions
- Recent links viewer
- Authentication support
- Anonymous mode
- Inline notifications
- Settings page
- Chrome and Firefox support

## 🎯 Roadmap

- [ ] Link analytics in popup
- [ ] Bulk link management
- [ ] QR code generation (Pro)
- [ ] Custom themes
- [ ] Export/import history
- [ ] Browser sync across devices
- [ ] Safari support

## 🐛 Known Issues

- Firefox: Clipboard API requires user interaction (use fallback method)
- Context menu on file:// URLs not supported by browser APIs

## 💡 Tips

- Use keyboard shortcuts for fastest link shortening
- Enable auto-copy for instant clipboard access
- Login for unlimited links and analytics
- Use custom slugs for branded short links
- Set default UTM parameters for campaign tracking

---

**Built with ❤️ by the EdgeLink team**
