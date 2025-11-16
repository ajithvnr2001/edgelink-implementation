/**
 * Email Rate Limiter - KV-based rate limiting to prevent email abuse
 * Uses Cloudflare KV (free tier: 100K reads/day)
 */

export class EmailRateLimiter {
  constructor(private kv: KVNamespace) {}

  async checkRateLimit(
    email: string,
    limitType: 'verification' | 'password_reset'
  ): Promise<boolean> {
    const key = `email_limit:${limitType}:${email}`;
    const countStr = await this.kv.get(key);

    const limits = {
      verification: 5,    // 5 verification emails per hour
      password_reset: 3   // 3 password reset emails per hour
    };

    const limit = limits[limitType];
    const count = countStr ? parseInt(countStr) : 0;

    if (count >= limit) {
      return false;
    }

    const newCount = count + 1;
    await this.kv.put(key, newCount.toString(), {
      expirationTtl: 3600 // 1 hour
    });

    return true;
  }

  /**
   * Clear rate limit for a specific email and type (for testing/admin)
   */
  async clearRateLimit(email: string, limitType: 'verification' | 'password_reset'): Promise<void> {
    const key = `email_limit:${limitType}:${email}`;
    await this.kv.delete(key);
  }
}
