/**
 * Slug Generation Utilities
 * Based on PRD FR-1: URL Shortening
 */

// Reserved slugs that cannot be used
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'dashboard',
  'stats',
  'login',
  'signup',
  'auth',
  'settings',
  'domains',
  'analytics',
  'docs',
  'help',
  'support',
  'terms',
  'privacy',
  'about',
  'contact',
  'pricing',
  'features',
  'blog',
  'health',
  'status'
]);

/**
 * Generate random alphanumeric slug
 * FR-1.2: Generate random 6-character alphanumeric codes (62^6 = 56B combinations)
 *
 * @param length - Length of slug (default: 6)
 * @returns Random alphanumeric string
 */
export function generateRandomSlug(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    slug += chars[randomValues[i] % chars.length];
  }

  return slug;
}

/**
 * Validate custom slug
 * FR-1.3: Allow custom slugs 5-20 characters (user-defined, unique per user)
 *
 * @param slug - Custom slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidCustomSlug(slug: string): boolean {
  // Check length
  if (slug.length < 5 || slug.length > 20) {
    return false;
  }

  // Check if alphanumeric + hyphens + underscores only
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(slug)) {
    return false;
  }

  // Check if reserved
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Check if slug is reserved
 * FR-1.5: Reserved slugs
 *
 * @param slug - Slug to check
 * @returns True if reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Generate slug with collision detection
 * FR-1.4: Collision detection with automatic retry (max 3 attempts)
 *
 * @param kv - KV namespace to check for existing slugs
 * @param customSlug - Optional custom slug
 * @param maxAttempts - Maximum retry attempts (default: 3)
 * @returns Generated slug
 * @throws Error if all attempts fail
 */
export async function generateSlugWithRetry(
  kv: KVNamespace,
  customSlug?: string,
  maxAttempts: number = 3
): Promise<string> {
  // If custom slug provided, validate and check availability
  if (customSlug) {
    if (!isValidCustomSlug(customSlug)) {
      throw new Error('Invalid custom slug format. Must be 5-20 alphanumeric characters, hyphens, or underscores.');
    }

    const existing = await kv.get(`slug:${customSlug}`);
    if (existing) {
      throw new Error('Custom slug already exists. Please choose a different one.');
    }

    return customSlug;
  }

  // Generate random slug with collision detection
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = generateRandomSlug();

    // Check if slug exists in KV
    const existing = await kv.get(`slug:${slug}`);
    if (!existing) {
      return slug;
    }
  }

  throw new Error('Failed to generate unique slug after maximum attempts');
}

/**
 * Generate AI-powered slug suggestions from URL
 * FR-8: AI-Powered Link Suggestions
 *
 * @param url - Destination URL
 * @returns Array of 3 suggested slugs
 */
export function generateSlugSuggestions(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;

    const suggestions: string[] = [];

    // Extract meaningful parts from URL
    const pathParts = pathname.split('/').filter(p => p && p.length > 0);
    const domainParts = hostname.split('.');

    // Suggestion 1: From path (last segment)
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1]
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 15);
      if (lastPart.length >= 5) {
        suggestions.push(lastPart);
      }
    }

    // Suggestion 2: From domain + path
    if (domainParts.length > 1 && pathParts.length > 0) {
      const combined = (domainParts[0] + pathParts[0])
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 15);
      if (combined.length >= 5 && !suggestions.includes(combined)) {
        suggestions.push(combined);
      }
    }

    // Suggestion 3: Random short slug
    suggestions.push(generateRandomSlug(8));

    // Fill remaining with random slugs
    while (suggestions.length < 3) {
      suggestions.push(generateRandomSlug(8));
    }

    return suggestions.slice(0, 3);
  } catch {
    // If URL parsing fails, return 3 random slugs
    return [
      generateRandomSlug(8),
      generateRandomSlug(8),
      generateRandomSlug(8)
    ];
  }
}

/**
 * Generate a unique slug (simplified wrapper)
 * Used for bulk import and other operations
 */
export async function generateSlug(env: any): Promise<string> {
  return await generateSlugWithRetry(env.LINKS_KV);
}

/**
 * Generate a random ID for internal use (domains, webhooks, etc.)
 * @param length - Length of ID (default: 16)
 * @returns Random alphanumeric string
 */
export function generateId(length: number = 16): string {
  return generateRandomSlug(length);
}
