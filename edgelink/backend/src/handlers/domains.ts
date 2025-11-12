/**
 * EdgeLink - Custom Domain Management Handler
 * Week 3 Implementation - Domain Verification, SSL, and Management
 * Based on PRD v4.1 Section 7.1: FR-4 Custom Domains
 */

import type { Env } from '../types';
import { generateId } from '../utils/slug';

export interface CustomDomain {
  domain_id: string;
  user_id: string;
  domain_name: string;
  verified: boolean;
  verification_token: string;
  verified_at?: string;
  created_at: string;
}

/**
 * POST /api/domains - Add a new custom domain
 *
 * Free tier: 1 domain, Pro: 5 domains (FR-4.5)
 */
export async function handleAddDomain(
  request: Request,
  env: Env,
  userId: string,
  userPlan: 'free' | 'pro'
): Promise<Response> {
  try {
    const body = await request.json() as { domain_name: string };

    if (!body.domain_name) {
      return new Response(
        JSON.stringify({
          error: 'Domain name is required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate domain name format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(body.domain_name)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid domain name format',
          code: 'INVALID_DOMAIN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if domain already exists
    const existingDomain = await env.DB.prepare(`
      SELECT domain_id FROM custom_domains WHERE domain_name = ?
    `).bind(body.domain_name).first();

    if (existingDomain) {
      return new Response(
        JSON.stringify({
          error: 'Domain already registered',
          code: 'DOMAIN_EXISTS'
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check user's domain count limit (FR-4.5: Free=1, Pro=5)
    const userDomains = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM custom_domains WHERE user_id = ?
    `).bind(userId).first() as { count: number };

    const maxDomains = userPlan === 'pro' ? 5 : 1;
    if (userDomains.count >= maxDomains) {
      return new Response(
        JSON.stringify({
          error: `Domain limit reached. ${userPlan === 'free' ? 'Upgrade to Pro for 5 domains' : 'Maximum 5 domains on Pro plan'}`,
          code: 'DOMAIN_LIMIT_REACHED',
          limit: maxDomains,
          current: userDomains.count
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique domain ID and verification token
    const domainId = generateId();
    const verificationToken = generateVerificationToken();

    // Insert domain into database
    await env.DB.prepare(`
      INSERT INTO custom_domains (domain_id, user_id, domain_name, verified, verification_token, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      domainId,
      userId,
      body.domain_name.toLowerCase(),
      false,
      verificationToken
    ).run();

    // Return domain with verification instructions
    return new Response(
      JSON.stringify({
        domain_id: domainId,
        domain_name: body.domain_name.toLowerCase(),
        verified: false,
        verification: {
          method: 'dns_txt',
          instructions: `Add the following TXT record to your DNS:`,
          record: {
            type: 'TXT',
            name: '_edgelink-verify',
            value: verificationToken,
            ttl: 3600
          },
          alternative: {
            method: 'cname',
            record: {
              type: 'CNAME',
              name: body.domain_name.toLowerCase(),
              value: 'cname.edgelink.io',
              ttl: 3600
            }
          }
        },
        message: 'Domain added. Please verify ownership by adding DNS records.'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Add domain error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to add domain',
        code: 'ADD_DOMAIN_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * POST /api/domains/:domainId/verify - Verify domain ownership
 *
 * Checks DNS TXT record (FR-4.4)
 */
export async function handleVerifyDomain(
  env: Env,
  userId: string,
  domainId: string
): Promise<Response> {
  try {
    // Get domain from database
    const domain = await env.DB.prepare(`
      SELECT domain_id, user_id, domain_name, verification_token, verified
      FROM custom_domains
      WHERE domain_id = ?
    `).bind(domainId).first() as CustomDomain | null;

    if (!domain) {
      return new Response(
        JSON.stringify({
          error: 'Domain not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check ownership
    if (domain.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If already verified, return success
    if (domain.verified) {
      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Domain already verified',
          verified_at: domain.verified_at
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Perform DNS TXT record verification (FR-4.4)
    const verificationResult = await verifyDNSRecord(domain.domain_name, domain.verification_token);

    if (verificationResult.verified) {
      // Add custom hostname to Cloudflare via API
      let hostnameAddedMessage = '';
      if (env.CF_ZONE_ID && env.CF_API_TOKEN) {
        try {
          const hostnameResult = await addCustomHostname(env, domain.domain_name);
          hostnameAddedMessage = hostnameResult.success
            ? ' Domain registered with Cloudflare.'
            : ` Note: ${hostnameResult.message}`;
        } catch (error) {
          console.error('Failed to add custom hostname:', error);
          hostnameAddedMessage = ' Warning: Could not register with Cloudflare automatically.';
        }
      }

      // Update domain as verified
      await env.DB.prepare(`
        UPDATE custom_domains
        SET verified = ?, verified_at = datetime('now')
        WHERE domain_id = ?
      `).bind(true, domainId).run();

      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Domain verified successfully!' + hostnameAddedMessage,
          domain_name: domain.domain_name,
          verified_at: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          verified: false,
          message: 'DNS verification failed. Please ensure TXT record is propagated.',
          expected_value: domain.verification_token,
          dns_check: {
            record_type: 'TXT',
            record_name: '_edgelink-verify',
            record_value: domain.verification_token,
            full_query_name: `_edgelink-verify.${domain.domain_name}`
          },
          debug: verificationResult.debug
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Verify domain error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to verify domain',
        code: 'VERIFICATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/domains - Get user's custom domains
 */
export async function handleGetDomains(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT domain_id, domain_name, verified, verification_token, verified_at, created_at
      FROM custom_domains
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return new Response(
      JSON.stringify({
        domains: result.results,
        total: result.results.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get domains error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch domains',
        code: 'FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * DELETE /api/domains/:domainId - Delete a custom domain
 */
export async function handleDeleteDomain(
  env: Env,
  userId: string,
  domainId: string
): Promise<Response> {
  try {
    // Verify ownership
    const domain = await env.DB.prepare(`
      SELECT user_id, domain_name FROM custom_domains WHERE domain_id = ?
    `).bind(domainId).first();

    if (!domain) {
      return new Response(
        JSON.stringify({
          error: 'Domain not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (domain.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if any links use this domain
    const linksCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM links WHERE custom_domain = ?
    `).bind(domain.domain_name).first() as { count: number };

    if (linksCount.count > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete domain with active links',
          code: 'DOMAIN_IN_USE',
          links_count: linksCount.count
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete domain
    await env.DB.prepare(`
      DELETE FROM custom_domains WHERE domain_id = ?
    `).bind(domainId).run();

    return new Response(
      JSON.stringify({
        message: 'Domain deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Delete domain error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete domain',
        code: 'DELETE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Verify DNS TXT record (FR-4.4)
 *
 * Uses DNS over HTTPS (DoH) to check for verification token
 */
async function verifyDNSRecord(domain: string, expectedToken: string): Promise<{
  verified: boolean;
  debug: {
    query_url: string;
    dns_status?: number;
    found_records?: string[];
    expected_token: string;
    error?: string;
  };
}> {
  const dohUrl = `https://cloudflare-dns.com/dns-query?name=_edgelink-verify.${domain}&type=TXT`;

  try {
    // Use Cloudflare DNS over HTTPS
    const response = await fetch(dohUrl, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });

    if (!response.ok) {
      console.error('DNS query failed:', response.status);
      return {
        verified: false,
        debug: {
          query_url: dohUrl,
          expected_token: expectedToken,
          error: `DNS query returned status ${response.status}`
        }
      };
    }

    const data = await response.json() as {
      Status: number;
      Answer?: Array<{ data: string }>;
    };

    // Extract found TXT records for debugging
    const foundRecords = data.Answer
      ? data.Answer.map(answer => answer.data.replace(/"/g, ''))
      : [];

    // Check if DNS record exists
    if (data.Status !== 0 || !data.Answer || data.Answer.length === 0) {
      return {
        verified: false,
        debug: {
          query_url: dohUrl,
          dns_status: data.Status,
          found_records: foundRecords,
          expected_token: expectedToken,
          error: data.Status === 3 ? 'DNS record not found (NXDOMAIN)' : `DNS status: ${data.Status}`
        }
      };
    }

    // Check if any TXT record matches the verification token
    for (const answer of data.Answer) {
      // Remove quotes from TXT record data
      const txtValue = answer.data.replace(/"/g, '');
      if (txtValue === expectedToken) {
        return {
          verified: true,
          debug: {
            query_url: dohUrl,
            dns_status: data.Status,
            found_records: foundRecords,
            expected_token: expectedToken
          }
        };
      }
    }

    return {
      verified: false,
      debug: {
        query_url: dohUrl,
        dns_status: data.Status,
        found_records: foundRecords,
        expected_token: expectedToken,
        error: 'TXT record found but value does not match'
      }
    };
  } catch (error) {
    console.error('DNS verification error:', error);
    return {
      verified: false,
      debug: {
        query_url: dohUrl,
        expected_token: expectedToken,
        error: error instanceof Error ? error.message : 'Unknown error during DNS verification'
      }
    };
  }
}

/**
 * Add custom hostname to Cloudflare via Custom Hostnames API
 * This allows the custom domain to route to the Worker automatically
 */
async function addCustomHostname(
  env: Env,
  hostname: string
): Promise<{ success: boolean; message: string }> {
  if (!env.CF_ZONE_ID || !env.CF_API_TOKEN) {
    return {
      success: false,
      message: 'Cloudflare API credentials not configured'
    };
  }

  try {
    // Check if hostname already exists
    const checkUrl = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames?hostname=${hostname}`;
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    const checkData = await checkResponse.json() as any;

    // If hostname already exists, return success
    if (checkData.success && checkData.result && checkData.result.length > 0) {
      console.log(`Custom hostname ${hostname} already exists`);
      return {
        success: true,
        message: 'Domain already registered'
      };
    }

    // Add new custom hostname
    const addUrl = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames`;
    const addResponse = await fetch(addUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname: hostname,
        ssl: {
          method: 'txt',
          type: 'dv',
          wildcard: false,
          settings: {
            min_tls_version: '1.2'
          }
        }
      })
    });

    const addData = await addResponse.json() as any;

    if (!addData.success) {
      const errorMsg = addData.errors?.[0]?.message || 'Unknown error';
      console.error('Failed to add custom hostname:', errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    console.log(`Custom hostname ${hostname} added successfully`);
    return {
      success: true,
      message: 'Domain registered successfully'
    };
  } catch (error) {
    console.error('Error adding custom hostname:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a unique verification token
 */
function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'edgelink-verify-';

  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  return token;
}
