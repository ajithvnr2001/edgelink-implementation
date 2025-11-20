# ShortedBro Logs API Documentation

**Base URL:** `https://go.shortedbro.xyz`

Complete API reference for the ShortedBro logging system. This feature allows you to view detailed logs of all your API requests, link redirects, errors, and export actions stored persistently in Cloudflare R2.

---

## Table of Contents

- [Overview](#overview)
- [Log Types](#log-types)
- [Log Storage Structure](#log-storage-structure)
- [API Endpoints](#api-endpoints)
  - [Get Logs](#get-logs)
  - [Get Log Storage Usage](#get-log-storage-usage)
  - [Delete Old Logs](#delete-old-logs)
- [Log Entry Formats](#log-entry-formats)
- [Use Cases](#use-cases)
- [Best Practices](#best-practices)
- [Error Codes](#error-codes)

---

## Overview

The ShortedBro Logs API provides access to persistent logs stored in Cloudflare R2. Every API request, link redirect, error, and export action is automatically logged and stored for 30 days (configurable).

### Key Features

- **Persistent Storage**: Logs are stored in Cloudflare R2, not ephemeral like console logs
- **User Isolation**: Each user's logs are stored separately and securely
- **Automatic Cleanup**: Logs older than 30 days are automatically deleted
- **Hourly Granularity**: Logs are organized by date and hour for efficient retrieval
- **Privacy Focused**: IP addresses are hashed, not stored in plain text

### Log Retention

| Log Type | Default Retention | Minimum Retention |
|----------|-------------------|-------------------|
| All Logs | 30 days | 7 days |

---

## Log Types

| Type | Description | When Created |
|------|-------------|--------------|
| `requests` | API calls made by the user | On any authenticated API request |
| `redirects` | Link click events | On each link redirect |
| `errors` | Errors from user requests | On request errors |
| `exports` | Export actions (CSV/JSON) | On data export |

### System Logs (Admin Only)

| Type | Description |
|------|-------------|
| `auth-failures` | Failed authentication attempts |
| `rate-limits` | Rate limit violations |
| `worker-errors` | Unhandled system errors |

---

## Log Storage Structure

Logs are organized in R2 with the following hierarchical structure:

```
edgelink-storage/
└── logs/
    └── users/
        └── {user_id}/
            └── {year}/{month}/{day}/{hour}/
                ├── requests.jsonl
                ├── redirects.jsonl
                ├── errors.jsonl
                └── exports.jsonl
```

### Example Paths

```
logs/users/usr_abc123/2025/11/19/10/requests.jsonl
logs/users/usr_abc123/2025/11/19/10/redirects.jsonl
logs/users/usr_abc123/2025/11/19/14/errors.jsonl
```

### File Format

Logs are stored in **JSONL (JSON Lines)** format - one JSON object per line:

```jsonl
{"timestamp":"2025-11-19T10:30:00Z","request_id":"req_001",...}
{"timestamp":"2025-11-19T10:31:00Z","request_id":"req_002",...}
{"timestamp":"2025-11-19T10:32:00Z","request_id":"req_003",...}
```

---

## API Endpoints

### Get Logs

Retrieve your logs with filtering and pagination options.

**Endpoint:** `GET /api/logs`

**Authentication:** Required (JWT Token or API Key)

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `requests` | Log type: `requests`, `redirects`, `errors`, `exports` |
| `days` | number | `1` | Number of days to retrieve (max 30) |
| `date` | string | - | Specific date in YYYY-MM-DD format |
| `page` | number | `1` | Page number for pagination |
| `limit` | number | `100` | Results per page (max 500) |

#### cURL Examples

**Get request logs from the last 24 hours:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/logs?type=requests&days=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get redirect logs from the last 7 days:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/logs?type=redirects&days=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get logs for a specific date:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/logs?type=requests&date=2025-11-19" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get error logs with pagination:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/logs?type=errors&days=3&page=2&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Using API Key:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/logs?type=redirects&days=7" \
  -H "X-API-Key: elk_your_api_key_here"
```

#### JavaScript Example

```javascript
// Get request logs from the last 7 days
async function getRequestLogs() {
  const response = await fetch('https://go.shortedbro.xyz/api/logs?type=requests&days=7', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });

  const data = await response.json();

  console.log(`Total logs: ${data.pagination.total}`);
  console.log(`Pages: ${data.pagination.total_pages}`);

  // Process each log entry
  data.logs.forEach(log => {
    console.log(`[${log.timestamp}] ${log.method} ${log.path} - ${log.status} (${log.duration_ms}ms)`);
  });

  return data;
}

// Get redirect logs for link analytics
async function getRedirectLogs(days = 30) {
  const response = await fetch(`https://go.shortedbro.xyz/api/logs?type=redirects&days=${days}`, {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });

  const data = await response.json();

  // Analyze by country
  const byCountry = {};
  data.logs.forEach(log => {
    byCountry[log.country] = (byCountry[log.country] || 0) + 1;
  });

  console.log('Clicks by country:', byCountry);
  return data;
}

// Get all pages of logs
async function getAllLogs(type = 'requests', days = 7) {
  let allLogs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://go.shortedbro.xyz/api/logs?type=${type}&days=${days}&page=${page}&limit=500`,
      {
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN'
        }
      }
    );

    const data = await response.json();
    allLogs = allLogs.concat(data.logs);
    hasMore = data.pagination.has_more;
    page++;
  }

  return allLogs;
}
```

#### Python Example

```python
import requests
from datetime import datetime, timedelta

BASE_URL = 'https://go.shortedbro.xyz'
HEADERS = {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
}

def get_logs(log_type='requests', days=1, page=1, limit=100):
    """Get logs with filtering options"""
    response = requests.get(
        f'{BASE_URL}/api/logs',
        headers=HEADERS,
        params={
            'type': log_type,
            'days': days,
            'page': page,
            'limit': limit
        }
    )

    data = response.json()
    return data

def get_logs_by_date(log_type, date_str):
    """Get logs for a specific date (YYYY-MM-DD)"""
    response = requests.get(
        f'{BASE_URL}/api/logs',
        headers=HEADERS,
        params={
            'type': log_type,
            'date': date_str
        }
    )

    return response.json()

def analyze_redirect_logs(days=30):
    """Analyze redirect logs for insights"""
    data = get_logs('redirects', days=days, limit=500)

    # Count by device type
    devices = {}
    browsers = {}
    countries = {}

    for log in data['logs']:
        # Device analysis
        device = log.get('device', 'unknown')
        devices[device] = devices.get(device, 0) + 1

        # Browser analysis
        browser = log.get('browser', 'unknown')
        browsers[browser] = browsers.get(browser, 0) + 1

        # Country analysis
        country = log.get('country', 'XX')
        countries[country] = countries.get(country, 0) + 1

    print(f"Total redirects: {data['pagination']['total']}")
    print(f"\nDevices: {devices}")
    print(f"Browsers: {browsers}")
    print(f"Top countries: {dict(sorted(countries.items(), key=lambda x: x[1], reverse=True)[:10])}")

    return data

def get_all_logs(log_type='requests', days=7):
    """Fetch all pages of logs"""
    all_logs = []
    page = 1

    while True:
        data = get_logs(log_type, days=days, page=page, limit=500)
        all_logs.extend(data['logs'])

        if not data['pagination']['has_more']:
            break
        page += 1

    return all_logs

def export_logs_to_csv(log_type='requests', days=7, output_file='logs.csv'):
    """Export logs to CSV file"""
    import csv

    logs = get_all_logs(log_type, days)

    if not logs:
        print("No logs found")
        return

    # Get all unique keys from logs
    fieldnames = set()
    for log in logs:
        fieldnames.update(log.keys())

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=sorted(fieldnames))
        writer.writeheader()
        writer.writerows(logs)

    print(f"Exported {len(logs)} logs to {output_file}")

# Example usage
if __name__ == '__main__':
    # Get recent request logs
    recent_logs = get_logs('requests', days=1)
    print(f"Found {recent_logs['pagination']['total']} logs")

    # Analyze redirect performance
    analyze_redirect_logs(days=7)

    # Export to CSV
    export_logs_to_csv('redirects', days=30, output_file='redirect_logs.csv')
```

#### Response Format

**Success Response (200 OK):**
```json
{
  "logs": [
    {
      "timestamp": "2025-11-19T10:30:00Z",
      "request_id": "req_1732012200_abc123",
      "method": "POST",
      "path": "/api/links",
      "status": 201,
      "duration_ms": 45,
      "ip": "192.168.1.1",
      "country": "US",
      "city": "New York",
      "user_agent": "Mozilla/5.0...",
      "referer": "https://example.com",
      "query": "?format=json"
    },
    {
      "timestamp": "2025-11-19T10:31:00Z",
      "request_id": "req_1732012260_def456",
      "method": "GET",
      "path": "/api/links",
      "status": 200,
      "duration_ms": 23,
      "ip": "192.168.1.1",
      "country": "US",
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 250,
    "total_pages": 3,
    "has_more": true
  },
  "filters": {
    "type": "requests",
    "start_date": "2025-11-18T10:30:00.000Z",
    "end_date": "2025-11-19T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid log type",
  "code": "INVALID_LOG_TYPE",
  "valid_types": ["requests", "redirects", "errors", "exports"]
}
```

---

### Get Log Storage Usage

Check how much storage your logs are using.

**Endpoint:** `GET /api/logs/storage`

**Authentication:** Required

#### cURL Example

```bash
curl -X GET "https://go.shortedbro.xyz/api/logs/storage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript Example

```javascript
async function getLogStorageUsage() {
  const response = await fetch('https://go.shortedbro.xyz/api/logs/storage', {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });

  const data = await response.json();

  console.log(`Storage used: ${data.storage_mb} MB`);
  console.log(`Storage used: ${data.storage_kb} KB`);
  console.log(`Storage used: ${data.storage_bytes} bytes`);

  return data;
}
```

#### Python Example

```python
def get_log_storage():
    """Get log storage usage"""
    response = requests.get(
        f'{BASE_URL}/api/logs/storage',
        headers=HEADERS
    )

    data = response.json()
    print(f"Storage used: {data['storage_mb']} MB")
    return data
```

#### Response Format

**Success Response (200 OK):**
```json
{
  "storage_bytes": 1048576,
  "storage_kb": 1024,
  "storage_mb": 1
}
```

---

### Delete Old Logs

Manually delete logs older than a specified number of days.

**Endpoint:** `DELETE /api/logs`

**Authentication:** Required

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days_old` | number | `30` | Delete logs older than this many days (minimum 7) |

#### cURL Examples

**Delete logs older than 30 days:**
```bash
curl -X DELETE "https://go.shortedbro.xyz/api/logs?days_old=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Delete logs older than 14 days:**
```bash
curl -X DELETE "https://go.shortedbro.xyz/api/logs?days_old=14" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### JavaScript Example

```javascript
async function deleteOldLogs(daysOld = 30) {
  const response = await fetch(`https://go.shortedbro.xyz/api/logs?days_old=${daysOld}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });

  const data = await response.json();

  console.log(`Deleted ${data.deleted_files} log files`);
  console.log(`Before date: ${data.before_date}`);

  return data;
}
```

#### Python Example

```python
def delete_old_logs(days_old=30):
    """Delete logs older than specified days"""
    response = requests.delete(
        f'{BASE_URL}/api/logs',
        headers=HEADERS,
        params={'days_old': days_old}
    )

    data = response.json()
    print(f"Deleted {data['deleted_files']} files older than {days_old} days")
    return data
```

#### Response Format

**Success Response (200 OK):**
```json
{
  "message": "Old logs deleted successfully",
  "deleted_files": 42,
  "before_date": "2025-10-20T00:00:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Minimum retention is 7 days",
  "code": "RETENTION_TOO_SHORT"
}
```

---

## Log Entry Formats

### Request Log Entry

Logged for every authenticated API request.

```json
{
  "timestamp": "2025-11-19T10:30:00Z",
  "request_id": "req_1732012200_abc123",
  "method": "POST",
  "path": "/api/links",
  "status": 201,
  "duration_ms": 45,
  "ip": "192.168.1.1",
  "country": "US",
  "city": "New York",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "referer": "https://dashboard.example.com",
  "query": "?format=json"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp |
| `request_id` | string | Unique request identifier |
| `method` | string | HTTP method (GET, POST, PUT, DELETE) |
| `path` | string | API endpoint path |
| `status` | number | HTTP response status code |
| `duration_ms` | number | Request processing time in milliseconds |
| `ip` | string | Client IP address |
| `country` | string | ISO country code (from Cloudflare) |
| `city` | string | City name (from Cloudflare) |
| `user_agent` | string | Client user agent string |
| `referer` | string | Referer header value |
| `query` | string | Query string parameters |

---

### Redirect Log Entry

Logged for every link click/redirect.

```json
{
  "timestamp": "2025-11-19T10:32:00Z",
  "request_id": "req_1732012320_xyz789",
  "slug": "my-link",
  "destination": "https://example.com/landing-page",
  "visitor_ip_hash": "a1b2c3d4e5f6",
  "country": "IN",
  "city": "Mumbai",
  "device": "mobile",
  "browser": "Chrome",
  "os": "Android",
  "referrer": "https://twitter.com/status/123"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp |
| `request_id` | string | Unique request identifier |
| `slug` | string | Short link slug |
| `destination` | string | Final redirect URL |
| `visitor_ip_hash` | string | Hashed IP for privacy |
| `country` | string | Visitor's country code |
| `city` | string | Visitor's city |
| `device` | string | Device type: `mobile`, `desktop`, `tablet` |
| `browser` | string | Browser name |
| `os` | string | Operating system |
| `referrer` | string | Traffic source URL or `direct` |

---

### Error Log Entry

Logged when errors occur during request processing.

```json
{
  "timestamp": "2025-11-19T10:34:00Z",
  "request_id": "req_1732012440_err001",
  "error_type": "ValidationError",
  "message": "Invalid URL format",
  "path": "/api/links",
  "stack": "ValidationError: Invalid URL format\n    at validateUrl...",
  "context": {
    "url": "not-a-valid-url",
    "field": "destination"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp |
| `request_id` | string | Unique request identifier |
| `error_type` | string | Error class/type name |
| `message` | string | Error message |
| `path` | string | API endpoint where error occurred |
| `stack` | string | Stack trace (if available) |
| `context` | object | Additional context data |

---

### Export Log Entry

Logged when data is exported.

```json
{
  "timestamp": "2025-11-19T10:40:00Z",
  "request_id": "req_1732012800_exp001",
  "export_type": "csv",
  "record_count": 150,
  "file_size_bytes": 12500,
  "filters": {
    "slug": "my-link",
    "timeRange": "30d"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp |
| `request_id` | string | Unique request identifier |
| `export_type` | string | Export format: `csv` or `json` |
| `record_count` | number | Number of records exported |
| `file_size_bytes` | number | Size of exported file |
| `filters` | object | Filters applied to export |

---

## Use Cases

### 1. Debugging API Issues

Track down failed requests and understand what went wrong:

```javascript
// Find all errors from the last 24 hours
async function findRecentErrors() {
  const data = await fetch('https://go.shortedbro.xyz/api/logs?type=errors&days=1', {
    headers: { 'Authorization': 'Bearer TOKEN' }
  }).then(r => r.json());

  // Group errors by type
  const errorsByType = {};
  data.logs.forEach(log => {
    const type = log.error_type;
    if (!errorsByType[type]) errorsByType[type] = [];
    errorsByType[type].push(log);
  });

  console.log('Errors by type:', errorsByType);
  return errorsByType;
}
```

### 2. Analyzing Link Performance

Understand how your links are performing:

```python
def analyze_link_performance(slug, days=30):
    """Analyze performance of a specific link"""
    data = get_logs('redirects', days=days, limit=500)

    # Filter for specific slug
    link_logs = [log for log in data['logs'] if log.get('slug') == slug]

    if not link_logs:
        print(f"No clicks found for {slug}")
        return

    # Calculate metrics
    total_clicks = len(link_logs)

    # Unique visitors (by IP hash)
    unique_visitors = len(set(log.get('visitor_ip_hash') for log in link_logs))

    # Peak hours
    hours = {}
    for log in link_logs:
        hour = log['timestamp'][11:13]
        hours[hour] = hours.get(hour, 0) + 1

    peak_hour = max(hours, key=hours.get)

    print(f"\nLink Performance: {slug}")
    print(f"Total clicks: {total_clicks}")
    print(f"Unique visitors: {unique_visitors}")
    print(f"Peak hour (UTC): {peak_hour}:00")
    print(f"Hourly distribution: {dict(sorted(hours.items()))}")
```

### 3. Monitoring API Usage

Track your API usage patterns:

```javascript
async function monitorApiUsage(days = 7) {
  const logs = await getAllLogs('requests', days);

  // Count by endpoint
  const byEndpoint = {};
  const byMethod = {};
  const byStatus = {};

  logs.forEach(log => {
    // By endpoint
    byEndpoint[log.path] = (byEndpoint[log.path] || 0) + 1;

    // By method
    byMethod[log.method] = (byMethod[log.method] || 0) + 1;

    // By status code
    const statusGroup = Math.floor(log.status / 100) + 'xx';
    byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;
  });

  console.log('API Usage Summary:');
  console.log('Top endpoints:', Object.entries(byEndpoint).sort((a, b) => b[1] - a[1]).slice(0, 10));
  console.log('By method:', byMethod);
  console.log('By status:', byStatus);

  // Calculate average response time
  const avgDuration = logs.reduce((sum, log) => sum + log.duration_ms, 0) / logs.length;
  console.log(`Average response time: ${avgDuration.toFixed(2)}ms`);
}
```

### 4. Geographic Analysis

Understand where your traffic comes from:

```python
def geographic_analysis(days=30):
    """Analyze traffic by geography"""
    data = get_logs('redirects', days=days, limit=500)

    countries = {}
    cities = {}

    for log in data['logs']:
        country = log.get('country', 'Unknown')
        city = log.get('city', 'Unknown')

        countries[country] = countries.get(country, 0) + 1
        if city != 'Unknown':
            cities[city] = cities.get(city, 0) + 1

    print("\nTop 10 Countries:")
    for country, count in sorted(countries.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {country}: {count}")

    print("\nTop 10 Cities:")
    for city, count in sorted(cities.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {city}: {count}")
```

### 5. Daily Reports

Generate automated daily reports:

```python
from datetime import datetime, timedelta

def generate_daily_report():
    """Generate a daily activity report"""
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

    # Get all log types for yesterday
    requests = get_logs_by_date('requests', yesterday)
    redirects = get_logs_by_date('redirects', yesterday)
    errors = get_logs_by_date('errors', yesterday)

    report = f"""
    ========================================
    Daily Report for {yesterday}
    ========================================

    API Requests: {requests['pagination']['total']}
    Link Redirects: {redirects['pagination']['total']}
    Errors: {errors['pagination']['total']}

    Top Endpoints:
    """

    # Calculate top endpoints
    endpoints = {}
    for log in requests['logs']:
        endpoints[log['path']] = endpoints.get(log['path'], 0) + 1

    for path, count in sorted(endpoints.items(), key=lambda x: x[1], reverse=True)[:5]:
        report += f"  {path}: {count}\n"

    print(report)
    return report
```

---

## Best Practices

### 1. Efficient Log Retrieval

- **Use date filtering** when you know the timeframe
- **Paginate large results** - don't fetch all logs at once
- **Filter by log type** to reduce data transfer

```javascript
// Good: Specific date and type
await fetch('/api/logs?type=errors&date=2025-11-19&limit=100')

// Bad: Fetching everything
await fetch('/api/logs?days=30&limit=10000')
```

### 2. Regular Cleanup

- Logs are automatically cleaned after 30 days
- For storage optimization, manually delete older logs:

```bash
# Delete logs older than 14 days
curl -X DELETE "/api/logs?days_old=14"
```

### 3. Monitoring Storage

- Check storage usage weekly
- Set up alerts if storage exceeds thresholds

```javascript
async function checkStorageAlert(thresholdMB = 100) {
  const storage = await getLogStorageUsage();
  if (storage.storage_mb > thresholdMB) {
    console.warn(`Warning: Log storage (${storage.storage_mb}MB) exceeds threshold (${thresholdMB}MB)`);
    // Send alert notification
  }
}
```

### 4. Privacy Considerations

- IP addresses are hashed in redirect logs
- Don't log sensitive data in custom contexts
- Comply with GDPR by allowing log deletion

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_LOG_TYPE` | 400 | Invalid log type specified |
| `DATE_RANGE_TOO_LARGE` | 400 | Date range exceeds 30 days |
| `RETENTION_TOO_SHORT` | 400 | Cannot delete logs less than 7 days old |
| `LOG_RETRIEVAL_FAILED` | 500 | Failed to retrieve logs from storage |
| `LOG_DELETION_FAILED` | 500 | Failed to delete logs |
| `STORAGE_INFO_FAILED` | 500 | Failed to get storage information |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |

---

## Automatic Log Cleanup

Logs are automatically cleaned up by a daily cron job that runs at 2 AM UTC:

- **User logs**: Deleted after 30 days
- **System logs**: Deleted after 30 days

To manually trigger cleanup for your account, use the DELETE endpoint:

```bash
curl -X DELETE "https://go.shortedbro.xyz/api/logs?days_old=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Rate Limits

The Logs API endpoints are subject to the same rate limits as other API endpoints:

| Plan | Requests per Day |
|------|-----------------|
| Free | 100 |
| Pro | 5,000 |

---

## Support

If you encounter issues with the Logs API:

1. Check the [Error Codes](#error-codes) section
2. Verify your authentication token is valid
3. Ensure you're not exceeding rate limits
4. Contact support at support@shortedbro.xyz

---

## Changelog

### v1.0.0 (November 2025)

- Initial release of Logs API
- Support for requests, redirects, errors, and exports log types
- Automatic 30-day cleanup
- Storage usage monitoring
- Manual log deletion
