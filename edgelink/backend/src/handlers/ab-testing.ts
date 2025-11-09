/**
 * A/B Testing Handler - Week 7
 *
 * Implements split testing functionality with:
 * - 50/50 traffic distribution
 * - Deterministic visitor assignment (IP hash)
 * - Conversion tracking
 * - Statistical significance calculation
 * - Pro feature only
 */

import { Context } from '../types';

/**
 * Create an A/B test for a link
 * POST /api/links/:slug/ab-test
 */
export async function handleCreateABTest(request: Request, env: Context['env'], userId: string, plan: string): Promise<Response> {
  try {
    // Pro feature only
    if (plan !== 'pro') {
      return new Response(
        JSON.stringify({ error: 'A/B testing is a Pro feature' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: any = await request.json();
    const { test_name, variant_a_url, variant_b_url } = body;

    // Validation
    if (!test_name || !variant_a_url || !variant_b_url) {
      return new Response(
        JSON.stringify({ error: 'test_name, variant_a_url, and variant_b_url are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate URLs
    try {
      new URL(variant_a_url);
      new URL(variant_b_url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format for variant URLs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and belongs to user
    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE slug = ? AND user_id = ?'
    ).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if an active A/B test already exists
    const existingTest = await env.DB.prepare(
      'SELECT * FROM ab_tests WHERE slug = ? AND status = ?'
    ).bind(slug, 'active').first();

    if (existingTest) {
      return new Response(
        JSON.stringify({ error: 'An active A/B test already exists for this link' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create A/B test
    const testId = `test_${generateRandomString(12)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO ab_tests (
        test_id, slug, user_id, test_name,
        variant_a_url, variant_b_url, status,
        created_at, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      testId, slug, userId, test_name,
      variant_a_url, variant_b_url, 'active',
      now, now
    ).run();

    return new Response(
      JSON.stringify({
        test_id: testId,
        slug,
        test_name,
        variant_a_url,
        variant_b_url,
        status: 'active',
        started_at: now
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating A/B test:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create A/B test' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get A/B test results
 * GET /api/links/:slug/ab-test
 */
export async function handleGetABTestResults(request: Request, env: Context['env'], userId: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and belongs to user
    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE slug = ? AND user_id = ?'
    ).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get A/B test
    const test = await env.DB.prepare(
      'SELECT * FROM ab_tests WHERE slug = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(slug).first();

    if (!test) {
      return new Response(
        JSON.stringify({ error: 'No A/B test found for this link' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get variant statistics
    const variantAStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as clicks,
        COUNT(DISTINCT visitor_hash) as unique_visitors,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
      FROM ab_test_events
      WHERE test_id = ? AND variant = ?
    `).bind(test.test_id, 'a').first();

    const variantBStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as clicks,
        COUNT(DISTINCT visitor_hash) as unique_visitors,
        SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
      FROM ab_test_events
      WHERE test_id = ? AND variant = ?
    `).bind(test.test_id, 'b').first();

    // Calculate conversion rates
    const variantAClicks = Number(variantAStats?.clicks || 0);
    const variantAConversions = Number(variantAStats?.conversions || 0);
    const variantAConversionRate = variantAClicks > 0
      ? (variantAConversions / variantAClicks) * 100
      : 0;

    const variantBClicks = Number(variantBStats?.clicks || 0);
    const variantBConversions = Number(variantBStats?.conversions || 0);
    const variantBConversionRate = variantBClicks > 0
      ? (variantBConversions / variantBClicks) * 100
      : 0;

    // Determine winner and statistical significance
    const totalClicks = variantAClicks + variantBClicks;
    const minSampleSize = 100; // Minimum clicks needed for significance

    let winner = 'none';
    let statisticalSignificance = 0;
    let recommendation = 'Not enough data to determine a winner yet';

    if (totalClicks >= minSampleSize) {
      // Calculate chi-squared statistic
      const chiSquared = calculateChiSquared(
        variantAClicks, variantAConversions,
        variantBClicks, variantBConversions
      );

      // Chi-squared critical value for 95% confidence (1 df) is 3.841
      statisticalSignificance = chiSquared >= 3.841 ? 0.95 : 0.8;

      if (variantAConversionRate > variantBConversionRate && chiSquared >= 3.841) {
        winner = 'a';
        const improvement = ((variantAConversionRate - variantBConversionRate) / variantBConversionRate) * 100;
        recommendation = `Variant A shows ${improvement.toFixed(1)}% improvement with 95% confidence`;
      } else if (variantBConversionRate > variantAConversionRate && chiSquared >= 3.841) {
        winner = 'b';
        const improvement = ((variantBConversionRate - variantAConversionRate) / variantAConversionRate) * 100;
        recommendation = `Variant B shows ${improvement.toFixed(1)}% improvement with 95% confidence`;
      } else if (chiSquared < 3.841) {
        recommendation = 'No statistically significant difference detected yet';
      }
    }

    return new Response(
      JSON.stringify({
        test: {
          test_id: test.test_id,
          test_name: test.test_name,
          status: test.status,
          started_at: test.started_at,
          ended_at: test.ended_at,
          variant_a_url: test.variant_a_url,
          variant_b_url: test.variant_b_url
        },
        results: {
          variant_a: {
            clicks: variantAClicks,
            conversions: variantAConversions,
            conversion_rate: Number(variantAConversionRate.toFixed(2)),
            unique_visitors: Number(variantAStats?.unique_visitors || 0)
          },
          variant_b: {
            clicks: variantBClicks,
            conversions: variantBConversions,
            conversion_rate: Number(variantBConversionRate.toFixed(2)),
            unique_visitors: Number(variantBStats?.unique_visitors || 0)
          },
          winner,
          statistical_significance: statisticalSignificance,
          recommendation
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting A/B test results:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get A/B test results' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Stop an A/B test
 * DELETE /api/links/:slug/ab-test
 */
export async function handleDeleteABTest(request: Request, env: Context['env'], userId: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and belongs to user
    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE slug = ? AND user_id = ?'
    ).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get active A/B test
    const test = await env.DB.prepare(
      'SELECT * FROM ab_tests WHERE slug = ? AND status = ?'
    ).bind(slug, 'active').first();

    if (!test) {
      return new Response(
        JSON.stringify({ error: 'No active A/B test found for this link' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get final statistics
    const variantAClicks = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM ab_test_events WHERE test_id = ? AND variant = ?'
    ).bind(test.test_id, 'a').first();

    const variantBClicks = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM ab_test_events WHERE test_id = ? AND variant = ?'
    ).bind(test.test_id, 'b').first();

    // Update test status
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE ab_tests
      SET status = ?, ended_at = ?, updated_at = ?
      WHERE test_id = ?
    `).bind('completed', now, now, test.test_id).run();

    return new Response(
      JSON.stringify({
        message: 'A/B test stopped and archived',
        test_id: test.test_id,
        final_results: {
          variant_a_clicks: Number(variantAClicks?.count || 0),
          variant_b_clicks: Number(variantBClicks?.count || 0)
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error stopping A/B test:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to stop A/B test' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Determine which variant a visitor should see
 * Uses deterministic IP-based hashing for consistency
 */
export async function determineVariant(env: Context['env'], slug: string, clientIp: string): Promise<string | null> {
  try {
    // Check if there's an active A/B test for this link
    const test = await env.DB.prepare(
      'SELECT * FROM ab_tests WHERE slug = ? AND status = ?'
    ).bind(slug, 'active').first();

    if (!test) {
      return null; // No active test
    }

    // Generate deterministic hash from IP + slug
    const visitorHash = await hashString(`${clientIp}:${slug}`);

    // Use hash to determine variant (50/50 split)
    const hashValue = parseInt(visitorHash.substring(0, 8), 16);
    const variant = hashValue % 2 === 0 ? 'a' : 'b';

    // Track the click
    await trackVariantClick(env, test.test_id as string, variant, visitorHash);

    // Return the appropriate URL
    return variant === 'a' ? test.variant_a_url as string : test.variant_b_url as string;

  } catch (error) {
    console.error('Error determining variant:', error);
    return null;
  }
}

/**
 * Track a variant click
 */
async function trackVariantClick(env: Context['env'], testId: string, variant: string, visitorHash: string): Promise<void> {
  try {
    const eventId = `evt_${generateRandomString(12)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO ab_test_events (
        event_id, test_id, variant, visitor_hash,
        event_type, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      eventId, testId, variant, visitorHash,
      'click', now
    ).run();

  } catch (error) {
    console.error('Error tracking variant click:', error);
  }
}

/**
 * Calculate chi-squared statistic for A/B test
 */
function calculateChiSquared(
  clicksA: number, conversionsA: number,
  clicksB: number, conversionsB: number
): number {
  // Calculate expected values
  const totalClicks = clicksA + clicksB;
  const totalConversions = conversionsA + conversionsB;

  if (totalClicks === 0) return 0;

  const conversionRate = totalConversions / totalClicks;

  const expectedConversionsA = clicksA * conversionRate;
  const expectedNonConversionsA = clicksA * (1 - conversionRate);
  const expectedConversionsB = clicksB * conversionRate;
  const expectedNonConversionsB = clicksB * (1 - conversionRate);

  // Calculate chi-squared
  let chiSquared = 0;

  if (expectedConversionsA > 0) {
    chiSquared += Math.pow(conversionsA - expectedConversionsA, 2) / expectedConversionsA;
  }
  if (expectedNonConversionsA > 0) {
    chiSquared += Math.pow((clicksA - conversionsA) - expectedNonConversionsA, 2) / expectedNonConversionsA;
  }
  if (expectedConversionsB > 0) {
    chiSquared += Math.pow(conversionsB - expectedConversionsB, 2) / expectedConversionsB;
  }
  if (expectedNonConversionsB > 0) {
    chiSquared += Math.pow((clicksB - conversionsB) - expectedNonConversionsB, 2) / expectedNonConversionsB;
  }

  return chiSquared;
}

/**
 * Hash a string using SHA-256
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random string for IDs
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
