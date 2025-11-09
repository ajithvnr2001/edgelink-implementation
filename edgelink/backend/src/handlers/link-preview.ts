/**
 * Link Preview Handler (Week 5)
 * Fetch Open Graph metadata and generate link previews
 */

import type { Env } from '../types';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  type?: string;
}

/**
 * Handle POST /api/preview
 * Generate link preview with Open Graph data
 */
export async function handleLinkPreview(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as { url: string };

    if (!body.url) {
      return new Response(
        JSON.stringify({
          error: 'URL is required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(body.url);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid URL format',
          code: 'INVALID_URL'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch preview data
    const preview = await fetchLinkPreview(body.url);

    return new Response(
      JSON.stringify(preview),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Link preview error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate link preview',
        code: 'PREVIEW_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Fetch link preview data
 */
async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const preview: LinkPreview = { url };

  try {
    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EdgeLink-Bot/1.0 (+https://edgelink.io)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const urlObj = new URL(url);

    // Parse Open Graph metadata
    preview.title = extractMetaTag(html, 'og:title') || extractTitle(html);
    preview.description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'description');
    preview.image = extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image');
    preview.siteName = extractMetaTag(html, 'og:site_name');
    preview.type = extractMetaTag(html, 'og:type');
    preview.author = extractMetaTag(html, 'author') || extractMetaTag(html, 'article:author');
    preview.publishedTime = extractMetaTag(html, 'article:published_time');

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch && faviconMatch[1]) {
      preview.favicon = resolveUrl(faviconMatch[1], urlObj);
    } else {
      // Default favicon location
      preview.favicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    }

    // Resolve relative URLs
    if (preview.image && !preview.image.startsWith('http')) {
      preview.image = resolveUrl(preview.image, urlObj);
    }

    // Default site name to domain
    if (!preview.siteName) {
      preview.siteName = urlObj.hostname.replace('www.', '');
    }

    // Truncate long descriptions
    if (preview.description && preview.description.length > 300) {
      preview.description = preview.description.substring(0, 297) + '...';
    }

  } catch (error) {
    console.error('Failed to fetch link preview:', error);
    // Return basic preview with URL info
    try {
      const urlObj = new URL(url);
      preview.siteName = urlObj.hostname.replace('www.', '');
      preview.title = urlObj.hostname;
    } catch (e) {
      preview.title = 'Link Preview Unavailable';
    }
  }

  return preview;
}

/**
 * Extract meta tag content
 */
function extractMetaTag(html: string, property: string): string | undefined {
  // Try Open Graph property
  let regex = new RegExp(
    `<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  let match = html.match(regex);

  if (match && match[1]) {
    return decodeHtmlEntities(match[1].trim());
  }

  // Try standard property
  regex = new RegExp(
    `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  match = html.match(regex);

  if (match && match[1]) {
    return decodeHtmlEntities(match[1].trim());
  }

  // Try name attribute
  regex = new RegExp(
    `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  match = html.match(regex);

  if (match && match[1]) {
    return decodeHtmlEntities(match[1].trim());
  }

  // Try Twitter card
  if (!property.startsWith('twitter:')) {
    regex = new RegExp(
      `<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`,
      'i'
    );
    match = html.match(regex);

    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

/**
 * Extract page title
 */
function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1].trim());
  }
  return undefined;
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(relativeUrl: string, baseUrl: URL): string {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }

  if (relativeUrl.startsWith('//')) {
    return `${baseUrl.protocol}${relativeUrl}`;
  }

  if (relativeUrl.startsWith('/')) {
    return `${baseUrl.protocol}//${baseUrl.hostname}${relativeUrl}`;
  }

  // Relative path
  const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
  return `${baseUrl.protocol}//${baseUrl.hostname}${basePath}${relativeUrl}`;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&nbsp;': ' '
  };

  return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
    return entities[match.toLowerCase()] || match;
  });
}
