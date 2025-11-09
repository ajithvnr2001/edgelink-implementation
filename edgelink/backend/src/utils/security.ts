/**
 * EdgeLink - Security Utilities
 * Week 3 Implementation - Abuse Prevention & Email Verification
 * Based on PRD v4.1 Week 3: Security Features
 */

/**
 * Check URL against Google Safe Browsing API
 * PRD FR-21: Spam Prevention
 *
 * Note: This is a simplified implementation for MVP
 * In production, integrate with actual Google Safe Browsing API
 */
export async function checkURLSafety(url: string): Promise<{
  safe: boolean;
  threats?: string[];
  reason?: string;
}> {
  try {
    // Basic validation first
    if (!isValidURL(url)) {
      return {
        safe: false,
        reason: 'Invalid URL format'
      };
    }

    // Check against blacklisted domains
    const blacklistedDomains = [
      'bit.ly',
      'tinyurl.com',
      'goo.gl',
      't.co',
      'ow.ly',
      // Add common phishing/spam domains
      'malware-site.com',
      'phishing-example.com'
    ];

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if domain is blacklisted
    for (const domain of blacklistedDomains) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return {
          safe: false,
          threats: ['REDIRECT_CHAIN'],
          reason: `URL shorteners not allowed: ${domain}`
        };
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /paypal/i,
      /amazon/i,
      /facebook/i,
      /google/i,
      /microsoft/i,
      /apple/i,
      /bank/i,
      /login/i,
      /verify/i,
      /account/i,
      /update/i,
      /secure/i
    ];

    // If domain contains suspicious keywords but isn't the official domain
    const officialDomains = [
      'paypal.com',
      'amazon.com',
      'facebook.com',
      'google.com',
      'microsoft.com',
      'apple.com'
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(hostname)) {
        const isOfficial = officialDomains.some(
          official => hostname === official || hostname.endsWith('.' + official)
        );

        if (!isOfficial) {
          return {
            safe: false,
            threats: ['PHISHING'],
            reason: 'Potential phishing domain detected'
          };
        }
      }
    }

    // In production, call Google Safe Browsing API here
    // const safeBrowsingResult = await callGoogleSafeBrowsingAPI(url);

    return {
      safe: true
    };
  } catch (error) {
    console.error('URL safety check error:', error);
    // Fail open - allow URL but log error
    return {
      safe: true
    };
  }
}

/**
 * Validate URL format
 */
function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate email verification token
 * PRD FR-21.3: Email verification before link activation
 */
export function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  return token;
}

/**
 * Send verification email
 * Note: This is a placeholder. In production, integrate with email service
 * (e.g., Resend, SendGrid, AWS SES)
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  baseURL: string
): Promise<boolean> {
  try {
    // In production, use an email service
    // Example with Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'EdgeLink <noreply@edgelink.io>',
    //     to: email,
    //     subject: 'Verify your EdgeLink account',
    //     html: `
    //       <h2>Welcome to EdgeLink!</h2>
    //       <p>Please verify your email address by clicking the link below:</p>
    //       <a href="${baseURL}/verify?token=${token}">Verify Email</a>
    //       <p>This link will expire in 24 hours.</p>
    //     `
    //   })
    // });

    // For MVP, log the verification link
    console.log(`
      Verification Email:
      To: ${email}
      Verification Link: ${baseURL}/verify?token=${token}

      In production, this would be sent via email service.
    `);

    return true;
  } catch (error) {
    console.error('Send verification email error:', error);
    return false;
  }
}

/**
 * Rate limit check for sensitive operations
 * PRD FR-21.4: Rate limiting for abuse prevention
 */
export async function checkSensitiveOperationRateLimit(
  identifier: string, // IP or user ID
  operation: string,
  env: any
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const key = `ratelimit:${operation}:${identifier}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    // Get current attempts from KV
    const dataStr = await env.LINKS_KV.get(key);
    let attempts = 0;
    let windowStart = now;

    if (dataStr) {
      const data = JSON.parse(dataStr);
      attempts = data.attempts || 0;
      windowStart = data.windowStart || now;

      // Check if window expired
      if (now - windowStart > windowMs) {
        attempts = 0;
        windowStart = now;
      }
    }

    // Check if rate limit exceeded
    if (attempts >= maxAttempts) {
      const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);
      return {
        allowed: false,
        retryAfter
      };
    }

    // Increment attempts
    await env.LINKS_KV.put(
      key,
      JSON.stringify({
        attempts: attempts + 1,
        windowStart
      }),
      {
        expirationTtl: Math.ceil(windowMs / 1000)
      }
    );

    return {
      allowed: true
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open to avoid blocking legitimate users
    return {
      allowed: true
    };
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potential HTML/script tags
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate custom slug format
 * PRD FR-1.3: Custom slugs 5-20 characters
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-zA-Z0-9_-]{5,20}$/;
  return slugRegex.test(slug);
}

/**
 * Check if slug is reserved
 * PRD FR-1.5: Reserved slugs
 */
export function isReservedSlug(slug: string): boolean {
  const reserved = [
    'admin',
    'api',
    'dashboard',
    'stats',
    'analytics',
    'login',
    'signup',
    'logout',
    'auth',
    'settings',
    'account',
    'profile',
    'help',
    'docs',
    'blog',
    'about',
    'contact',
    'terms',
    'privacy',
    'pricing',
    'features'
  ];

  return reserved.includes(slug.toLowerCase());
}
