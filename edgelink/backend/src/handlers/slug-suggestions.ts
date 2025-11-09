/**
 * AI Slug Suggestions Handler (Week 5)
 * Parse URL title and suggest intelligent slugs
 */

import type { Env } from '../types';

/**
 * Handle POST /api/suggest-slug
 * Generate intelligent slug suggestions based on URL
 */
export async function handleSuggestSlug(
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

    // Fetch the URL to parse title and meta tags
    const suggestions = await generateSlugSuggestions(body.url, env);

    return new Response(
      JSON.stringify({
        url: body.url,
        suggestions
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Slug suggestion error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate slug suggestions',
        code: 'SUGGESTION_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Generate intelligent slug suggestions
 */
async function generateSlugSuggestions(url: string, env: Env): Promise<string[]> {
  const suggestions: string[] = [];

  try {
    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EdgeLink-Bot/1.0 (+https://edgelink.io)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      suggestions.push(...generateSlugsFromText(title));
    }

    // Parse Open Graph title
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      const ogTitle = ogTitleMatch[1].trim();
      suggestions.push(...generateSlugsFromText(ogTitle));
    }

    // Parse meta description for context
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (descMatch && descMatch[1]) {
      const description = descMatch[1].trim();
      const keywords = extractKeywords(description);
      suggestions.push(...keywords.slice(0, 2));
    }

    // Parse URL path for keywords
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname
      .split('/')
      .filter(segment => segment && segment.length > 2)
      .map(segment => cleanSlug(segment));

    suggestions.push(...pathSegments.slice(0, 2));

  } catch (error) {
    console.log('Failed to fetch URL for suggestions:', error);
  }

  // Fallback: generate from domain
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const domainParts = domain.split('.')[0];
    suggestions.push(cleanSlug(domainParts));
  } catch (error) {
    console.log('Failed to parse URL:', error);
  }

  // Remove duplicates and invalid slugs
  const uniqueSuggestions = Array.from(new Set(suggestions))
    .filter(slug => isValidSlug(slug))
    .slice(0, 5);

  // If no suggestions, generate random ones
  if (uniqueSuggestions.length === 0) {
    uniqueSuggestions.push(
      generateRandomSlug(6),
      generateRandomSlug(8),
      generateRandomSlug(10)
    );
  }

  // Check availability
  const availableSuggestions: string[] = [];
  for (const slug of uniqueSuggestions) {
    const exists = await env.DB.prepare(
      'SELECT slug FROM links WHERE slug = ?'
    ).bind(slug).first();

    if (!exists) {
      availableSuggestions.push(slug);
    }
  }

  // Fill with random if needed
  while (availableSuggestions.length < 3) {
    const randomSlug = generateRandomSlug(8);
    const exists = await env.DB.prepare(
      'SELECT slug FROM links WHERE slug = ?'
    ).bind(randomSlug).first();

    if (!exists) {
      availableSuggestions.push(randomSlug);
    }
  }

  return availableSuggestions.slice(0, 5);
}

/**
 * Generate slugs from text
 */
function generateSlugsFromText(text: string): string[] {
  const slugs: string[] = [];

  // Full text slug
  const fullSlug = cleanSlug(text);
  if (fullSlug.length >= 5 && fullSlug.length <= 20) {
    slugs.push(fullSlug);
  }

  // First N words
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (words.length > 0) {
    // First 2 words
    slugs.push(words.slice(0, 2).join('-'));
    // First 3 words
    if (words.length >= 3) {
      slugs.push(words.slice(0, 3).join('-'));
    }
    // First word only
    slugs.push(words[0]);
  }

  // Acronym from words
  if (words.length >= 2) {
    const acronym = words.map(w => w[0]).join('');
    if (acronym.length >= 3) {
      slugs.push(acronym);
    }
  }

  return slugs.map(s => cleanSlug(s)).filter(s => s.length >= 5 && s.length <= 20);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Return first 3 meaningful words
  return Array.from(new Set(words)).slice(0, 3);
}

/**
 * Clean and format slug
 */
function cleanSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

/**
 * Validate slug format
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{5,20}$/.test(slug);
}

/**
 * Generate random slug
 */
function generateRandomSlug(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}
