/**
 * R2 Log Service
 * Stores logs in Cloudflare R2 with daily/hourly structure
 *
 * Structure:
 * logs/users/{user_id}/{year}/{month}/{day}/{hour}/{log_type}.jsonl
 * logs/system/{year}/{month}/{day}/{hour}/{log_type}.jsonl
 */

import type { Env } from '../../types';

// Log entry types
export interface BaseLogEntry {
  timestamp: string;
  request_id: string;
}

export interface RequestLogEntry extends BaseLogEntry {
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  ip: string;
  country: string;
  city?: string;
  user_agent: string;
  referer?: string;
  query?: string;
}

export interface RedirectLogEntry extends BaseLogEntry {
  slug: string;
  destination: string;
  visitor_ip_hash: string;
  country: string;
  city?: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
}

export interface ErrorLogEntry extends BaseLogEntry {
  error_type: string;
  message: string;
  path: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface ExportLogEntry extends BaseLogEntry {
  export_type: 'csv' | 'json';
  record_count: number;
  file_size_bytes?: number;
  filters?: Record<string, any>;
}

export interface AuthFailureLogEntry extends BaseLogEntry {
  ip: string;
  country: string;
  reason: string;
  attempted_path: string;
  email?: string;
}

export interface RateLimitLogEntry extends BaseLogEntry {
  ip: string;
  endpoint: string;
  limit_type: string;
  current_count: number;
  user_id?: string;
}

export type LogType = 'requests' | 'redirects' | 'errors' | 'exports' | 'auth-failures' | 'rate-limits' | 'worker-errors';

export type LogEntry = RequestLogEntry | RedirectLogEntry | ErrorLogEntry | ExportLogEntry | AuthFailureLogEntry | RateLimitLogEntry;

export class R2LogService {
  private env: Env;
  private logBuffer: Map<string, LogEntry[]>;
  private flushTimeout: number | null = null;
  private readonly BUFFER_SIZE = 10; // Flush after 10 entries
  private readonly FLUSH_INTERVAL = 5000; // Flush every 5 seconds

  constructor(env: Env) {
    this.env = env;
    this.logBuffer = new Map();
  }

  /**
   * Generate R2 key path for user logs
   */
  private getUserLogPath(userId: string, logType: LogType, date?: Date): string {
    const now = date || new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');

    return `logs/users/${userId}/${year}/${month}/${day}/${hour}/${logType}.jsonl`;
  }

  /**
   * Generate R2 key path for system logs
   */
  private getSystemLogPath(logType: LogType, date?: Date): string {
    const now = date || new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');

    return `logs/system/${year}/${month}/${day}/${hour}/${logType}.jsonl`;
  }

  /**
   * Generate a unique request ID
   */
  public generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Hash IP address for privacy
   */
  private hashIP(ip: string): string {
    // Simple hash - in production, use a proper hashing algorithm
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Append log entry to R2 (creates file if doesn't exist)
   */
  private async appendToR2(key: string, entry: LogEntry): Promise<void> {
    try {
      // Check if R2 bucket is available
      if (!this.env.R2_BUCKET) {
        console.log('[R2LogService] R2 bucket not configured, skipping log');
        return;
      }

      // Get existing content
      const existing = await this.env.R2_BUCKET.get(key);
      let content = '';

      if (existing) {
        content = await existing.text();
      }

      // Append new entry
      content += JSON.stringify(entry) + '\n';

      // Write back to R2
      await this.env.R2_BUCKET.put(key, content, {
        httpMetadata: {
          contentType: 'application/x-ndjson'
        }
      });
    } catch (error) {
      console.error('[R2LogService] Failed to write log to R2:', error);
    }
  }

  /**
   * Log a user request
   */
  async logRequest(
    userId: string,
    data: Omit<RequestLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getUserLogPath(userId, 'requests');
    await this.appendToR2(key, entry);
  }

  /**
   * Log a redirect/click event
   */
  async logRedirect(
    userId: string,
    data: Omit<RedirectLogEntry, 'timestamp' | 'request_id' | 'visitor_ip_hash'> & {
      request_id?: string;
      visitor_ip: string;
    }
  ): Promise<void> {
    const entry: RedirectLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      slug: data.slug,
      destination: data.destination,
      visitor_ip_hash: this.hashIP(data.visitor_ip),
      country: data.country,
      city: data.city,
      device: data.device,
      browser: data.browser,
      os: data.os,
      referrer: data.referrer
    };

    const key = this.getUserLogPath(userId, 'redirects');
    await this.appendToR2(key, entry);
  }

  /**
   * Log an error for a specific user
   */
  async logError(
    userId: string,
    data: Omit<ErrorLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getUserLogPath(userId, 'errors');
    await this.appendToR2(key, entry);
  }

  /**
   * Log a system-level error (no user context)
   */
  async logSystemError(
    data: Omit<ErrorLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getSystemLogPath('worker-errors');
    await this.appendToR2(key, entry);
  }

  /**
   * Log an export action
   */
  async logExport(
    userId: string,
    data: Omit<ExportLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: ExportLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getUserLogPath(userId, 'exports');
    await this.appendToR2(key, entry);
  }

  /**
   * Log an authentication failure
   */
  async logAuthFailure(
    data: Omit<AuthFailureLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: AuthFailureLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getSystemLogPath('auth-failures');
    await this.appendToR2(key, entry);
  }

  /**
   * Log a rate limit hit
   */
  async logRateLimit(
    data: Omit<RateLimitLogEntry, 'timestamp' | 'request_id'> & { request_id?: string }
  ): Promise<void> {
    const entry: RateLimitLogEntry = {
      timestamp: new Date().toISOString(),
      request_id: data.request_id || this.generateRequestId(),
      ...data
    };

    const key = this.getSystemLogPath('rate-limits');
    await this.appendToR2(key, entry);
  }

  /**
   * Get logs for a user within a date range
   */
  async getUserLogs(
    userId: string,
    logType: LogType,
    startDate: Date,
    endDate: Date
  ): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];

    if (!this.env.R2_BUCKET) {
      return logs;
    }

    // List all objects in the user's log directory
    const prefix = `logs/users/${userId}/`;
    const listed = await this.env.R2_BUCKET.list({ prefix });

    for (const object of listed.objects) {
      // Check if this file matches the log type and is within date range
      if (object.key.includes(`/${logType}.jsonl`)) {
        // Parse date from path: logs/users/{id}/{year}/{month}/{day}/{hour}/
        const pathParts = object.key.split('/');
        if (pathParts.length >= 7) {
          const year = parseInt(pathParts[3]);
          const month = parseInt(pathParts[4]) - 1;
          const day = parseInt(pathParts[5]);
          const hour = parseInt(pathParts[6]);

          const fileDate = new Date(Date.UTC(year, month, day, hour));

          if (fileDate >= startDate && fileDate <= endDate) {
            const obj = await this.env.R2_BUCKET.get(object.key);
            if (obj) {
              const content = await obj.text();
              const lines = content.trim().split('\n');
              for (const line of lines) {
                if (line) {
                  try {
                    logs.push(JSON.parse(line));
                  } catch (e) {
                    console.error('[R2LogService] Failed to parse log line:', e);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return logs;
  }

  /**
   * Delete logs older than a specified date
   */
  async cleanupOldLogs(userId: string, beforeDate: Date): Promise<number> {
    let deletedCount = 0;

    if (!this.env.R2_BUCKET) {
      return deletedCount;
    }

    const prefix = `logs/users/${userId}/`;
    const listed = await this.env.R2_BUCKET.list({ prefix });

    for (const object of listed.objects) {
      // Parse date from path
      const pathParts = object.key.split('/');
      if (pathParts.length >= 6) {
        const year = parseInt(pathParts[3]);
        const month = parseInt(pathParts[4]) - 1;
        const day = parseInt(pathParts[5]);

        const fileDate = new Date(Date.UTC(year, month, day));

        if (fileDate < beforeDate) {
          await this.env.R2_BUCKET.delete(object.key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * Get storage usage for a user's logs
   */
  async getUserLogStorageSize(userId: string): Promise<number> {
    let totalSize = 0;

    if (!this.env.R2_BUCKET) {
      return totalSize;
    }

    const prefix = `logs/users/${userId}/`;
    const listed = await this.env.R2_BUCKET.list({ prefix });

    for (const object of listed.objects) {
      totalSize += object.size;
    }

    return totalSize;
  }
}

// Export a factory function to create the service
export function createR2LogService(env: Env): R2LogService {
  return new R2LogService(env);
}
