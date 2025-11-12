# EdgeLink Webhooks Documentation

**Complete Guide: Setup, Configuration, Security & Best Practices**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Webhook Events](#webhook-events)
4. [Setup & Configuration](#setup--configuration)
5. [Payload Structure](#payload-structure)
6. [Security & Verification](#security--verification)
7. [Retry Logic](#retry-logic)
8. [Best Practices](#best-practices)
9. [Limitations](#limitations)
10. [Testing Webhooks](#testing-webhooks)
11. [Troubleshooting](#troubleshooting)
12. [Code Examples](#code-examples)

---

## Overview

### What are Webhooks?

Webhooks are **HTTP callbacks** that EdgeLink sends to your server in real-time when events occur. Instead of polling our API for updates, webhooks push notifications to you instantly.

### Why Use Webhooks?

✅ **Real-time notifications** - Know immediately when links are clicked
✅ **Reduced API calls** - No need to poll for updates
✅ **Event-driven architecture** - Build reactive applications
✅ **Custom integrations** - Connect to Slack, Discord, CRMs, analytics tools
✅ **Automated workflows** - Trigger actions based on link activity

### Pro Feature

⚠️ **Webhooks are a Pro-only feature**. You need a Pro plan to create and manage webhooks.

---

## Getting Started

### Prerequisites

Before setting up webhooks, you need:

1. ✅ **EdgeLink Pro account**
2. ✅ **Public HTTPS endpoint** to receive webhooks
3. ✅ **API key or JWT token** for authentication
4. ✅ **SSL certificate** (webhooks only work with HTTPS)

### Quick Start (5 minutes)

```bash
# 1. Create a webhook
curl -X POST https://go.shortedbro.xyz/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/edgelink",
    "events": ["link.clicked", "link.created"],
    "secret": "your_webhook_secret_key"
  }'

# 2. Your server receives webhook when events occur
# 3. Verify signature and process event
```

---

## Webhook Events

EdgeLink supports **4 event types** that trigger webhooks:

### 1. `link.clicked`

Triggered every time someone clicks a short link.

**Frequency:** High (can be 1000s per second for popular links)

**Use Cases:**
- Real-time analytics dashboards
- Notification systems
- Click tracking
- Conversion attribution

**Payload Example:**
```json
{
  "event": "link.clicked",
  "timestamp": "2025-11-11T10:30:45.123Z",
  "data": {
    "slug": "abc123",
    "short_url": "https://go.shortedbro.xyz/abc123",
    "destination": "https://example.com",
    "click_id": "clk_xyz789",
    "visitor": {
      "ip_hash": "5d41402abc4b2a76b9719d911017c592",
      "country": "US",
      "city": "New York",
      "device": "mobile",
      "browser": "Chrome",
      "os": "iOS",
      "referrer": "https://twitter.com"
    },
    "routing": {
      "type": "device",
      "matched": "mobile"
    }
  }
}
```

---

### 2. `link.created`

Triggered when a new short link is created.

**Frequency:** Low-Medium

**Use Cases:**
- Auto-share new links to team chat
- Sync with external databases
- Trigger welcome emails
- Backup systems

**Payload Example:**
```json
{
  "event": "link.created",
  "timestamp": "2025-11-11T10:00:00.000Z",
  "data": {
    "slug": "abc123",
    "short_url": "https://go.shortedbro.xyz/abc123",
    "destination": "https://example.com",
    "created_by": "usr_123",
    "custom_domain": null,
    "expires_at": "2025-12-31T23:59:59Z",
    "max_clicks": 1000,
    "password_protected": false,
    "routing_enabled": {
      "device": false,
      "geo": true,
      "referrer": false
    }
  }
}
```

---

### 3. `link.updated`

Triggered when a link is modified (destination, routing, expiration, etc.).

**Frequency:** Low

**Use Cases:**
- Audit logs
- Change notifications
- Sync updated configurations
- Compliance tracking

**Payload Example:**
```json
{
  "event": "link.updated",
  "timestamp": "2025-11-11T11:15:30.000Z",
  "data": {
    "slug": "abc123",
    "short_url": "https://go.shortedbro.xyz/abc123",
    "updated_by": "usr_123",
    "changes": {
      "destination": {
        "old": "https://example.com",
        "new": "https://newdestination.com"
      },
      "geo_routing": {
        "old": null,
        "new": {
          "US": "https://us.example.com",
          "GB": "https://uk.example.com"
        }
      }
    }
  }
}
```

---

### 4. `link.deleted`

Triggered when a link is permanently deleted.

**Frequency:** Low

**Use Cases:**
- Cleanup external systems
- Archive analytics data
- Audit trails
- Compliance requirements

**Payload Example:**
```json
{
  "event": "link.deleted",
  "timestamp": "2025-11-11T12:00:00.000Z",
  "data": {
    "slug": "abc123",
    "short_url": "https://go.shortedbro.xyz/abc123",
    "deleted_by": "usr_123",
    "final_stats": {
      "total_clicks": 5432,
      "unique_visitors": 3210,
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

## Setup & Configuration

### Step 1: Create Webhook Endpoint

Create an HTTPS endpoint on your server that can receive POST requests.

**Requirements:**
- ✅ Must use HTTPS (not HTTP)
- ✅ Must respond with 2xx status code within 5 seconds
- ✅ Should verify webhook signatures
- ✅ Should handle duplicate events (idempotency)

**Example Endpoint:**
```
https://your-server.com/webhooks/edgelink
```

---

### Step 2: Create Webhook via API

**Endpoint:** `POST /api/webhooks`

**Authentication:** Required (JWT or API Key, Pro plan)

**Request Body:**
```json
{
  "url": "https://your-server.com/webhooks/edgelink",
  "events": ["link.clicked", "link.created", "link.updated", "link.deleted"],
  "secret": "your_webhook_secret_key_min_32_chars",
  "description": "Production webhook for analytics"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | HTTPS endpoint to receive webhooks |
| `events` | array | Yes | List of events to subscribe to (1-4 events) |
| `secret` | string | Yes | Secret key for signature verification (min 32 chars) |
| `description` | string | No | Human-readable description |

**Response (201):**
```json
{
  "webhook_id": "whk_abc123xyz",
  "url": "https://your-server.com/webhooks/edgelink",
  "events": ["link.clicked", "link.created"],
  "created_at": "2025-11-11T10:00:00.000Z",
  "status": "active",
  "secret_preview": "your_we...key"
}
```

---

### Step 3: List Your Webhooks

**Endpoint:** `GET /api/webhooks`

**Response (200):**
```json
{
  "webhooks": [
    {
      "webhook_id": "whk_abc123xyz",
      "url": "https://your-server.com/webhooks/edgelink",
      "events": ["link.clicked", "link.created"],
      "status": "active",
      "created_at": "2025-11-11T10:00:00.000Z",
      "last_triggered": "2025-11-11T11:30:45.000Z",
      "success_rate": 98.5,
      "total_deliveries": 12543
    }
  ],
  "total": 1
}
```

---

### Step 4: Delete Webhook

**Endpoint:** `DELETE /api/webhooks/{webhook_id}`

**Response (200):**
```json
{
  "message": "Webhook deleted successfully",
  "webhook_id": "whk_abc123xyz"
}
```

---

## Payload Structure

### Common Headers

Every webhook request includes these headers:

```http
POST /webhooks/edgelink HTTP/1.1
Host: your-server.com
Content-Type: application/json
User-Agent: EdgeLink-Webhook/1.0
X-EdgeLink-Event: link.clicked
X-EdgeLink-Delivery: dlv_xyz789
X-EdgeLink-Signature: sha256=5d41402abc4b2a76b9719d911017c592...
X-EdgeLink-Timestamp: 1699564800
```

**Header Descriptions:**

| Header | Description |
|--------|-------------|
| `X-EdgeLink-Event` | Event type (link.clicked, link.created, etc.) |
| `X-EdgeLink-Delivery` | Unique delivery ID (for deduplication) |
| `X-EdgeLink-Signature` | HMAC-SHA256 signature for verification |
| `X-EdgeLink-Timestamp` | Unix timestamp when webhook was sent |

---

### Base Payload Structure

All webhooks follow this structure:

```json
{
  "event": "link.clicked",
  "timestamp": "2025-11-11T10:30:45.123Z",
  "webhook_id": "whk_abc123xyz",
  "delivery_id": "dlv_xyz789",
  "data": {
    // Event-specific data
  }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event type identifier |
| `timestamp` | string | ISO 8601 timestamp when event occurred |
| `webhook_id` | string | ID of the webhook configuration |
| `delivery_id` | string | Unique ID for this delivery attempt |
| `data` | object | Event-specific payload data |

---

## Security & Verification

### Why Verify Webhooks?

⚠️ **Critical:** Always verify webhook signatures to:
- Prevent spoofed/fake webhooks
- Ensure data hasn't been tampered with
- Confirm webhooks are from EdgeLink
- Protect against replay attacks

---

### Signature Verification

EdgeLink signs every webhook with **HMAC-SHA256** using your secret key.

**Algorithm:**
```
signature = HMAC-SHA256(secret, timestamp + "." + request_body)
```

**Header Format:**
```
X-EdgeLink-Signature: sha256=5d41402abc4b2a76b9719d911017c592...
```

---

### Verification Examples

#### Node.js (Express)

```javascript
const crypto = require('crypto');
const express = require('express');

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks/edgelink', (req, res) => {
  const signature = req.headers['x-edgelink-signature'];
  const timestamp = req.headers['x-edgelink-timestamp'];
  const rawBody = req.body.toString('utf8');

  // Verify signature
  if (!verifySignature(signature, timestamp, rawBody)) {
    return res.status(401).send('Invalid signature');
  }

  // Verify timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return res.status(401).send('Timestamp too old');
  }

  // Process webhook
  const payload = JSON.parse(rawBody);
  console.log('Webhook received:', payload.event);

  res.status(200).send('OK');
});

function verifySignature(signature, timestamp, body) {
  const secret = process.env.WEBHOOK_SECRET;
  const signedPayload = timestamp + '.' + body;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Extract signature from "sha256=..." format
  const receivedSignature = signature.replace('sha256=', '');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

---

#### Python (Flask)

```python
import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret_key'

@app.route('/webhooks/edgelink', methods=['POST'])
def webhook():
    # Get headers
    signature = request.headers.get('X-EdgeLink-Signature')
    timestamp = request.headers.get('X-EdgeLink-Timestamp')

    # Get raw body
    raw_body = request.get_data(as_text=True)

    # Verify signature
    if not verify_signature(signature, timestamp, raw_body):
        return jsonify({'error': 'Invalid signature'}), 401

    # Verify timestamp (prevent replay attacks)
    current_time = int(time.time())
    if abs(current_time - int(timestamp)) > 300:
        return jsonify({'error': 'Timestamp too old'}), 401

    # Process webhook
    payload = request.json
    print(f"Webhook received: {payload['event']}")

    # Handle different events
    if payload['event'] == 'link.clicked':
        handle_link_clicked(payload['data'])
    elif payload['event'] == 'link.created':
        handle_link_created(payload['data'])

    return jsonify({'status': 'success'}), 200

def verify_signature(signature, timestamp, body):
    """Verify HMAC-SHA256 signature"""
    signed_payload = f"{timestamp}.{body}"

    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Extract signature from "sha256=..." format
    received_signature = signature.replace('sha256=', '')

    # Constant-time comparison
    return hmac.compare_digest(expected_signature, received_signature)

def handle_link_clicked(data):
    """Process link.clicked event"""
    print(f"Link {data['slug']} clicked from {data['visitor']['country']}")
    # Your custom logic here

def handle_link_created(data):
    """Process link.created event"""
    print(f"New link created: {data['short_url']}")
    # Your custom logic here

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
```

---

#### PHP

```php
<?php

// Get headers
$signature = $_SERVER['HTTP_X_EDGELINK_SIGNATURE'];
$timestamp = $_SERVER['HTTP_X_EDGELINK_TIMESTAMP'];

// Get raw body
$rawBody = file_get_contents('php://input');

// Your webhook secret
$secret = getenv('WEBHOOK_SECRET');

// Verify signature
if (!verifySignature($signature, $timestamp, $rawBody, $secret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Verify timestamp (prevent replay attacks)
$currentTime = time();
if (abs($currentTime - intval($timestamp)) > 300) {
    http_response_code(401);
    echo json_encode(['error' => 'Timestamp too old']);
    exit;
}

// Parse JSON payload
$payload = json_decode($rawBody, true);

// Handle events
switch ($payload['event']) {
    case 'link.clicked':
        handleLinkClicked($payload['data']);
        break;
    case 'link.created':
        handleLinkCreated($payload['data']);
        break;
    default:
        error_log("Unknown event: " . $payload['event']);
}

// Respond with success
http_response_code(200);
echo json_encode(['status' => 'success']);

function verifySignature($signature, $timestamp, $body, $secret) {
    $signedPayload = $timestamp . '.' . $body;
    $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

    // Extract signature from "sha256=..." format
    $receivedSignature = str_replace('sha256=', '', $signature);

    // Constant-time comparison
    return hash_equals($expectedSignature, $receivedSignature);
}

function handleLinkClicked($data) {
    error_log("Link clicked: " . $data['slug']);
    // Your custom logic
}

function handleLinkCreated($data) {
    error_log("Link created: " . $data['short_url']);
    // Your custom logic
}
?>
```

---

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io/ioutil"
    "log"
    "math"
    "net/http"
    "strconv"
    "strings"
    "time"
)

type WebhookPayload struct {
    Event      string                 `json:"event"`
    Timestamp  string                 `json:"timestamp"`
    WebhookID  string                 `json:"webhook_id"`
    DeliveryID string                 `json:"delivery_id"`
    Data       map[string]interface{} `json:"data"`
}

const webhookSecret = "your_webhook_secret_key"

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    // Get headers
    signature := r.Header.Get("X-EdgeLink-Signature")
    timestamp := r.Header.Get("X-EdgeLink-Timestamp")

    // Read body
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Cannot read body", http.StatusBadRequest)
        return
    }

    // Verify signature
    if !verifySignature(signature, timestamp, string(body)) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Verify timestamp
    ts, _ := strconv.ParseInt(timestamp, 10, 64)
    currentTime := time.Now().Unix()
    if math.Abs(float64(currentTime-ts)) > 300 {
        http.Error(w, "Timestamp too old", http.StatusUnauthorized)
        return
    }

    // Parse payload
    var payload WebhookPayload
    if err := json.Unmarshal(body, &payload); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Handle events
    switch payload.Event {
    case "link.clicked":
        handleLinkClicked(payload.Data)
    case "link.created":
        handleLinkCreated(payload.Data)
    default:
        log.Printf("Unknown event: %s", payload.Event)
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"success"}`))
}

func verifySignature(signature, timestamp, body string) bool {
    signedPayload := timestamp + "." + body

    mac := hmac.New(sha256.New, []byte(webhookSecret))
    mac.Write([]byte(signedPayload))
    expectedSignature := hex.EncodeToString(mac.Sum(nil))

    // Extract signature from "sha256=..." format
    receivedSignature := strings.TrimPrefix(signature, "sha256=")

    return hmac.Equal([]byte(expectedSignature), []byte(receivedSignature))
}

func handleLinkClicked(data map[string]interface{}) {
    log.Printf("Link clicked: %v", data["slug"])
    // Your custom logic
}

func handleLinkCreated(data map[string]interface{}) {
    log.Printf("Link created: %v", data["short_url"])
    // Your custom logic
}

func main() {
    http.HandleFunc("/webhooks/edgelink", webhookHandler)
    log.Println("Webhook server listening on :3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}
```

---

## Retry Logic

### How EdgeLink Handles Failures

EdgeLink automatically retries failed webhook deliveries with **exponential backoff**.

**Retry Schedule:**

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 (initial) | 0s | 0s |
| 2 | 5s | 5s |
| 3 | 30s | 35s |
| 4 | 2m | 2m 35s |
| 5 | 10m | 12m 35s |
| 6 | 1h | 1h 12m 35s |
| 7 | 6h | 7h 12m 35s |

**Max Retries:** 7 attempts over ~7 hours

**Failure Conditions:**
- HTTP status code 5xx (500, 502, 503, 504)
- Connection timeout (>5 seconds)
- DNS resolution failure
- SSL certificate errors

**Success Conditions:**
- HTTP status code 2xx (200, 201, 202, 204)
- Response received within 5 seconds

---

### Idempotency

⚠️ **Important:** Your webhook endpoint may receive the same event multiple times.

**Reasons for Duplicates:**
- Network issues causing retries
- Your server responds slowly
- EdgeLink doesn't receive your 2xx response

**Solution:** Use the `delivery_id` field to deduplicate events.

**Example (Node.js + Redis):**
```javascript
const redis = require('redis');
const client = redis.createClient();

app.post('/webhooks/edgelink', async (req, res) => {
  const deliveryId = req.body.delivery_id;

  // Check if already processed
  const exists = await client.exists(`webhook:${deliveryId}`);
  if (exists) {
    console.log('Duplicate webhook, skipping');
    return res.status(200).send('OK');
  }

  // Mark as processed (expire after 7 days)
  await client.setex(`webhook:${deliveryId}`, 604800, '1');

  // Process webhook
  processWebhook(req.body);

  res.status(200).send('OK');
});
```

---

## Best Practices

### 1. Respond Quickly (< 5 seconds)

✅ **Do:**
```javascript
app.post('/webhook', async (req, res) => {
  // Respond immediately
  res.status(200).send('OK');

  // Process asynchronously
  processWebhookAsync(req.body);
});
```

❌ **Don't:**
```javascript
app.post('/webhook', async (req, res) => {
  // This blocks the response!
  await longRunningDatabaseQuery();
  await sendEmailNotifications();
  await updateAnalytics();

  res.status(200).send('OK'); // Too late!
});
```

---

### 2. Implement Idempotency

Store `delivery_id` to prevent duplicate processing:

```python
# Example: Store in database
def process_webhook(payload):
    delivery_id = payload['delivery_id']

    # Check if already processed
    if webhook_processed(delivery_id):
        return

    # Mark as processed
    mark_webhook_processed(delivery_id)

    # Process event
    handle_event(payload)
```

---

### 3. Verify Signatures

Always verify HMAC signatures - see [Security & Verification](#security--verification) section.

---

### 4. Handle All Event Types

Even if you only subscribe to `link.clicked`, handle all event types gracefully:

```javascript
switch (payload.event) {
  case 'link.clicked':
    handleLinkClicked(payload.data);
    break;
  case 'link.created':
    handleLinkCreated(payload.data);
    break;
  default:
    console.log('Unknown event type:', payload.event);
    // Still return 200 to prevent retries
}
```

---

### 5. Log Everything

Maintain webhook logs for debugging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'webhook.log' })
  ]
});

app.post('/webhook', (req, res) => {
  logger.info('Webhook received', {
    event: req.body.event,
    delivery_id: req.body.delivery_id,
    timestamp: req.body.timestamp
  });

  // Process webhook...
});
```

---

### 6. Monitor Webhook Health

Track success rates and failures:

```javascript
const metrics = {
  received: 0,
  processed: 0,
  failed: 0
};

app.post('/webhook', async (req, res) => {
  metrics.received++;

  try {
    await processWebhook(req.body);
    metrics.processed++;
    res.status(200).send('OK');
  } catch (error) {
    metrics.failed++;
    logger.error('Webhook processing failed', error);
    res.status(500).send('Error');
  }
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

---

### 7. Use Queue Systems for High Volume

For `link.clicked` events on popular links:

```javascript
const Queue = require('bull');
const webhookQueue = new Queue('webhooks');

app.post('/webhook', async (req, res) => {
  // Add to queue immediately
  await webhookQueue.add(req.body);

  // Respond right away
  res.status(200).send('OK');
});

// Process queue workers
webhookQueue.process(async (job) => {
  await processWebhook(job.data);
});
```

---

## Limitations

### Rate Limits

| Limit Type | Value | Scope |
|------------|-------|-------|
| **Max Webhooks** | 5 per account | Per user |
| **Max Events** | 4 types | Per webhook |
| **Payload Size** | 10 KB | Per request |
| **Timeout** | 5 seconds | Per delivery |
| **Retry Attempts** | 7 attempts | Per delivery |
| **Retry Window** | 7 hours | Max duration |

---

### Event Frequency

| Event Type | Expected Frequency | Notes |
|------------|-------------------|-------|
| `link.clicked` | Very High | Can be 1000s/second for viral links |
| `link.created` | Low-Medium | Depends on usage |
| `link.updated` | Low | Infrequent |
| `link.deleted` | Low | Infrequent |

⚠️ **Warning:** For high-traffic links with `link.clicked` events, expect **bursts of webhooks**. Use queue systems!

---

### URL Requirements

✅ **Allowed:**
- HTTPS URLs only
- Valid SSL certificate
- Public internet accessible
- Standard ports (443)

❌ **Not Allowed:**
- HTTP URLs (insecure)
- localhost/127.0.0.1
- Private IP ranges (10.x, 192.168.x, 172.16.x)
- Self-signed certificates
- Non-standard ports

---

### Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Webhook delivery logs | 30 days |
| Failed delivery attempts | 7 days |
| Webhook configuration | Until deleted |

---

## Testing Webhooks

### Local Development

Use **ngrok** or similar tunneling service to expose localhost:

```bash
# 1. Start your local server
node webhook-server.js

# 2. Start ngrok
ngrok http 3000

# 3. Use ngrok HTTPS URL for webhook
# Example: https://abc123.ngrok.io/webhooks/edgelink
```

---

### Test Event Generator

Create a test webhook manually:

```bash
# Send test link.clicked event
curl -X POST https://your-server.com/webhooks/edgelink \
  -H "Content-Type: application/json" \
  -H "X-EdgeLink-Event: link.clicked" \
  -H "X-EdgeLink-Delivery: test_dlv_123" \
  -H "X-EdgeLink-Signature: sha256=..." \
  -H "X-EdgeLink-Timestamp: $(date +%s)" \
  -d '{
    "event": "link.clicked",
    "timestamp": "2025-11-11T10:30:45.123Z",
    "webhook_id": "whk_test",
    "delivery_id": "dlv_test_123",
    "data": {
      "slug": "test123",
      "short_url": "https://go.shortedbro.xyz/test123",
      "destination": "https://example.com",
      "visitor": {
        "country": "US",
        "device": "mobile"
      }
    }
  }'
```

---

### Webhook Testing Tools

**Recommended Tools:**
- [webhook.site](https://webhook.site) - Inspect webhook payloads
- [RequestBin](https://requestbin.com) - Collect and debug webhooks
- [ngrok](https://ngrok.com) - Local development tunnel
- [Postman](https://www.postman.com) - Test webhook endpoints

---

## Troubleshooting

### Webhook Not Received

**Checklist:**
1. ✅ Verify webhook is created: `GET /api/webhooks`
2. ✅ Check webhook status is `active`
3. ✅ Confirm events are configured correctly
4. ✅ Test endpoint is accessible publicly
5. ✅ Check server logs for incoming requests
6. ✅ Verify SSL certificate is valid

---

### Invalid Signature Error

**Causes:**
- Wrong secret key in verification
- Not using raw request body
- Incorrect signature algorithm
- Body parsing middleware modifying request

**Solution:**
```javascript
// Use raw body parser
app.use(express.raw({ type: 'application/json' }));

// Don't parse JSON before verification
app.post('/webhook', (req, res) => {
  const rawBody = req.body.toString('utf8');
  verifySignature(signature, timestamp, rawBody);

  // Now parse JSON
  const payload = JSON.parse(rawBody);
});
```

---

### Timeout Errors

**Causes:**
- Server responding too slowly (>5 seconds)
- Blocking operations in webhook handler
- Database queries taking too long

**Solution:**
```javascript
// Respond immediately, process async
app.post('/webhook', async (req, res) => {
  res.status(200).send('OK'); // Respond first

  // Process in background
  setImmediate(() => {
    processWebhook(req.body);
  });
});
```

---

### Duplicate Events

**Causes:**
- Network retries
- Server didn't respond with 2xx
- Processing timeout

**Solution:**
Implement idempotency using `delivery_id` - see [Best Practices](#best-practices)

---

### Missing Events

**Possible Reasons:**
1. **Not subscribed:** Check `events` array in webhook config
2. **Webhook failed:** Check delivery logs
3. **Endpoint down:** Verify server is running
4. **Rate limiting:** Check if your server is rate limiting EdgeLink

---

## Use Case Examples

### 1. Slack Notifications

Send link clicks to Slack channel:

```javascript
const axios = require('axios');

async function handleLinkClicked(data) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `🔗 Link clicked!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Link:* ${data.short_url}\n*Destination:* ${data.destination}\n*Country:* ${data.visitor.country}\n*Device:* ${data.visitor.device}`
        }
      }
    ]
  });
}
```

---

### 2. Real-time Analytics Dashboard

Stream clicks to dashboard via WebSocket:

```javascript
const io = require('socket.io')(server);

app.post('/webhook', (req, res) => {
  if (req.body.event === 'link.clicked') {
    // Broadcast to all connected clients
    io.emit('click', {
      slug: req.body.data.slug,
      country: req.body.data.visitor.country,
      timestamp: req.body.timestamp
    });
  }

  res.status(200).send('OK');
});
```

---

### 3. CRM Integration

Sync new links to CRM:

```javascript
async function handleLinkCreated(data) {
  // Add to HubSpot, Salesforce, etc.
  await crm.createActivity({
    type: 'link_created',
    url: data.short_url,
    destination: data.destination,
    timestamp: data.timestamp
  });
}
```

---

### 4. Auto-Tweet New Links

Tweet when new link is created:

```javascript
const Twitter = require('twitter');

async function handleLinkCreated(data) {
  const tweet = `Check out our new link: ${data.short_url}`;

  await twitter.post('statuses/update', {
    status: tweet
  });
}
```

---

## API Reference Summary

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks` | List webhooks |
| GET | `/api/webhooks/{id}` | Get webhook details |
| PUT | `/api/webhooks/{id}` | Update webhook |
| DELETE | `/api/webhooks/{id}` | Delete webhook |

### Event Types

- `link.clicked` - Real-time click tracking
- `link.created` - New link created
- `link.updated` - Link modified
- `link.deleted` - Link deleted

### Rate Limits

- **Free:** No webhooks
- **Pro:** 5 webhooks, unlimited events

---

## Support & Resources

- **API Documentation:** `/api-docs.html`
- **Full Capabilities:** `CAPABILITIES.md`
- **GitHub Examples:** `examples/` directory
- **Support:** support@edgelink.dev

---

**Last Updated:** November 11, 2025
**Version:** 1.0.0
**Feature Status:** ✅ Production Ready (Pro Feature)
