# EdgeLink Extension Icons

## Required Icon Sizes

The extension requires icons in the following sizes:

- **icon-16.png**: 16x16px (toolbar icon, small)
- **icon-32.png**: 32x32px (toolbar icon, retina)
- **icon-48.png**: 48x48px (extensions page)
- **icon-128.png**: 128x128px (Chrome Web Store, Firefox Add-ons)

## Design Guidelines

### Brand Colors
- **Primary**: #3B82F6 (Blue)
- **Secondary**: #10B981 (Green)
- **Dark**: #1F2937 (Background)

### Icon Design
- Use the EdgeLink "E" monogram or chain link symbol
- Maintain visual clarity at all sizes
- Use gradient or solid colors
- Ensure good contrast for both light and dark themes

### Creating Icons

You can create the icons using:
- **Figma**: Design at 512x512, export at required sizes
- **Sketch**: Vector design, multiple exports
- **Inkscape**: Free vector editor
- **GIMP/Photoshop**: Raster design

### Export Settings
- Format: PNG
- Background: Transparent (for toolbar icons)
- Color space: sRGB
- Resolution: 72 DPI

## Quick Icon Creation

For development/testing, you can use online tools:

1. **Favicon.io**: https://favicon.io/
   - Generate simple letter icons
   - Export multiple sizes

2. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Upload 512x512 source image
   - Generates all required sizes

3. **Canva**: https://canva.com
   - Create custom logo
   - Export in multiple sizes

## Installation

1. Create or obtain the required icon files
2. Place them in the `browser-extension/icons/` directory
3. Ensure filenames match:
   - `icon-16.png`
   - `icon-32.png`
   - `icon-48.png`
   - `icon-128.png`

## Temporary Placeholder

For development, you can use a simple colored square as a placeholder:

- Solid blue (#3B82F6) background
- White "E" or chain link symbol
- Export at all required sizes

---

**Note**: The actual icon PNG files are not included in the repository. Please create them following the guidelines above before loading the extension.
