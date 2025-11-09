/**
 * Bulk Import Handler (Week 5/6)
 * Import links from CSV files
 */

import type { Env } from '../types';
import { generateSlug } from '../utils/slug';
import { isValidURL } from '../utils/validation';

interface ImportRow {
  destination: string;
  custom_slug?: string;
  custom_domain?: string;
  expires_at?: string;
  utm_params?: string;
  password?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    slug?: string;
    destination?: string;
    error: string;
  }>;
  imported_links: Array<{
    slug: string;
    destination: string;
    short_url: string;
  }>;
}

/**
 * Handle POST /api/import/links
 * Import links from CSV data
 */
export async function handleBulkImport(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    let csvData: string;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return new Response(
          JSON.stringify({
            error: 'CSV file is required',
            code: 'INVALID_INPUT'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      csvData = await (file as File).text();
    } else if (contentType.includes('text/csv')) {
      // Handle raw CSV data
      csvData = await request.text();
    } else {
      // Handle JSON with CSV data
      const body = await request.json() as { csv: string };
      if (!body.csv) {
        return new Response(
          JSON.stringify({
            error: 'CSV data is required',
            code: 'INVALID_INPUT'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      csvData = body.csv;
    }

    // Parse CSV
    const rows = parseCSV(csvData);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No valid rows found in CSV',
          code: 'EMPTY_CSV'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check limits
    const userLinksCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM links WHERE user_id = ?'
    ).bind(userId).first();

    const currentCount = (userLinksCount?.count as number) || 0;
    const limit = plan === 'pro' ? 5000 : 500;

    if (currentCount + rows.length > limit) {
      return new Response(
        JSON.stringify({
          error: `Import would exceed your plan limit. Current: ${currentCount}, Limit: ${limit}`,
          code: 'LIMIT_EXCEEDED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Import links
    const result = await importLinks(env, userId, rows);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to import links',
        code: 'IMPORT_FAILED',
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
 * Parse CSV data into rows
 */
function parseCSV(csvData: string): ImportRow[] {
  const lines = csvData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const header = lines[0].split(',').map(col => col.trim().toLowerCase());

  // Find required column indices
  const destIndex = header.findIndex(col =>
    col === 'destination' || col === 'url' || col === 'target' || col === 'destination_url'
  );

  if (destIndex === -1) {
    throw new Error('CSV must have a "destination" or "url" column');
  }

  const slugIndex = header.findIndex(col =>
    col === 'slug' || col === 'custom_slug' || col === 'short_code'
  );
  const domainIndex = header.findIndex(col =>
    col === 'domain' || col === 'custom_domain'
  );
  const expiresIndex = header.findIndex(col =>
    col === 'expires' || col === 'expires_at' || col === 'expiry'
  );
  const utmIndex = header.findIndex(col =>
    col === 'utm' || col === 'utm_params'
  );
  const passwordIndex = header.findIndex(col =>
    col === 'password'
  );

  // Parse data rows
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCSVLine(line);

    if (cells.length <= destIndex) {
      continue;
    }

    const row: ImportRow = {
      destination: cells[destIndex].trim()
    };

    if (slugIndex !== -1 && cells[slugIndex]) {
      row.custom_slug = cells[slugIndex].trim();
    }

    if (domainIndex !== -1 && cells[domainIndex]) {
      row.custom_domain = cells[domainIndex].trim();
    }

    if (expiresIndex !== -1 && cells[expiresIndex]) {
      row.expires_at = cells[expiresIndex].trim();
    }

    if (utmIndex !== -1 && cells[utmIndex]) {
      row.utm_params = cells[utmIndex].trim();
    }

    if (passwordIndex !== -1 && cells[passwordIndex]) {
      row.password = cells[passwordIndex].trim();
    }

    if (row.destination) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells;
}

/**
 * Import links into database
 */
async function importLinks(
  env: Env,
  userId: string,
  rows: ImportRow[]
): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    successful: 0,
    failed: 0,
    errors: [],
    imported_links: []
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 for header and 0-index

    try {
      // Validate destination URL
      if (!isValidURL(row.destination)) {
        throw new Error('Invalid destination URL');
      }

      // Generate or validate slug
      let slug: string;
      if (row.custom_slug) {
        // Validate custom slug
        if (!/^[a-z0-9-]{5,20}$/i.test(row.custom_slug)) {
          throw new Error('Invalid custom slug format (5-20 chars, alphanumeric and dashes only)');
        }

        // Check if slug exists
        const existing = await env.DB.prepare(
          'SELECT slug FROM links WHERE slug = ?'
        ).bind(row.custom_slug).first();

        if (existing) {
          throw new Error('Slug already exists');
        }

        slug = row.custom_slug;
      } else {
        // Generate random slug
        slug = await generateSlug(env);
      }

      // Hash password if provided
      let passwordHash: string | null = null;
      if (row.password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(row.password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      // Insert into D1
      await env.DB.prepare(`
        INSERT INTO links (
          slug, user_id, destination, custom_domain,
          expires_at, utm_params, password_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        slug,
        userId,
        row.destination,
        row.custom_domain || null,
        row.expires_at || null,
        row.utm_params || null,
        passwordHash
      ).run();

      // Store in KV for fast redirects
      const linkData = {
        slug,
        destination: row.destination,
        custom_domain: row.custom_domain || null,
        expires_at: row.expires_at ? new Date(row.expires_at).getTime() : null,
        password_hash: passwordHash,
        utm_params: row.utm_params || null
      };

      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));

      // Add to results
      result.successful++;
      result.imported_links.push({
        slug,
        destination: row.destination,
        short_url: `https://edgelink.io/${slug}`
      });

    } catch (error) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        slug: row.custom_slug,
        destination: row.destination,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return result;
}
