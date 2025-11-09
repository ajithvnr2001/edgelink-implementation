/**
 * Validation Utilities
 */

/**
 * Validate URL format
 * FR-1.1: Accept HTTP/HTTPS URLs up to 2,048 characters
 *
 * @param url - URL to validate
 * @returns True if valid
 */
export function isValidURL(url: string): boolean {
  // Check length
  if (url.length > 2048) {
    return false;
  }

  // Check if valid URL format
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one uppercase, one lowercase, one number
 *
 * @param password - Password to validate
 * @returns True if valid
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
}

/**
 * Validate custom domain format
 *
 * @param domain - Domain to validate
 * @returns True if valid
 */
export function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Sanitize user input to prevent XSS
 *
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
