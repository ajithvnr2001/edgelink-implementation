/**
 * Log Viewer Handler
 * API endpoints for retrieving user logs from R2
 */

import type { Env } from '../types';
import { createR2LogService, LogType } from '../services/logs/r2LogService';

/**
 * Handle GET /api/logs
 * Get user's logs with filtering options
 */
export async function handleGetLogs(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const logType = (url.searchParams.get('type') as LogType) || 'requests';
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD format
    const daysBack = parseInt(url.searchParams.get('days') || '1');

    // Validate log type
    const validTypes: LogType[] = ['requests', 'redirects', 'errors', 'exports'];
    if (!validTypes.includes(logType)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid log type',
          code: 'INVALID_LOG_TYPE',
          valid_types: validTypes
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      // Specific date
      startDate = new Date(dateParam + 'T00:00:00Z');
      endDate = new Date(dateParam + 'T23:59:59Z');
    } else {
      // Last N days
      endDate = new Date();
      startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    }

    // Validate date range (max 30 days)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    if (daysDiff > 30) {
      return new Response(
        JSON.stringify({
          error: 'Date range too large',
          code: 'DATE_RANGE_TOO_LARGE',
          max_days: 30
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const logger = createR2LogService(env);
    const logs = await logger.getUserLogs(userId, logType, startDate, endDate);

    // Get pagination params
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const offset = (page - 1) * limit;

    // Paginate results
    const paginatedLogs = logs.slice(offset, offset + limit);
    const totalPages = Math.ceil(logs.length / limit);

    return new Response(
      JSON.stringify({
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total: logs.length,
          total_pages: totalPages,
          has_more: page < totalPages
        },
        filters: {
          type: logType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[handleGetLogs] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve logs',
        code: 'LOG_RETRIEVAL_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/logs/storage
 * Get user's log storage usage
 */
export async function handleGetLogStorage(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const logger = createR2LogService(env);
    const storageBytes = await logger.getUserLogStorageSize(userId);

    return new Response(
      JSON.stringify({
        storage_bytes: storageBytes,
        storage_kb: Math.round(storageBytes / 1024 * 100) / 100,
        storage_mb: Math.round(storageBytes / (1024 * 1024) * 100) / 100
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[handleGetLogStorage] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get storage info',
        code: 'STORAGE_INFO_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle DELETE /api/logs
 * Delete user's logs older than specified date
 */
export async function handleDeleteOldLogs(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const daysOld = parseInt(url.searchParams.get('days_old') || '30');

    // Minimum 7 days retention
    if (daysOld < 7) {
      return new Response(
        JSON.stringify({
          error: 'Minimum retention is 7 days',
          code: 'RETENTION_TOO_SHORT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const beforeDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    const logger = createR2LogService(env);
    const deletedCount = await logger.cleanupOldLogs(userId, beforeDate);

    return new Response(
      JSON.stringify({
        message: 'Old logs deleted successfully',
        deleted_files: deletedCount,
        before_date: beforeDate.toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[handleDeleteOldLogs] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete logs',
        code: 'LOG_DELETION_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
