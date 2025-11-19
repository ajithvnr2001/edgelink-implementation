# ShortedBro Webhook Documentation

**Documentation URL:** `https://shortedbro.xyz/docs`

Complete guide to setting up and handling webhooks from ShortedBro.

---

## Table of Contents

- [Overview](#overview)
- [Creating Webhooks](#creating-webhooks)
- [Webhook Events](#webhook-events)
- [Webhook Payloads](#webhook-payloads)
- [Signature Verification](#signature-verification)
- [Handling Webhooks](#handling-webhooks)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow you to receive real-time notifications when events occur in your ShortedBro account. Instead of polling the API, webhooks push data to your server immediately when something happens.

**Key Features:**
- Real-time notifications
- HMAC-SHA256 signature verification
- Automatic retries on failure (7 attempts over ~7 hours)
- Filter by specific events or links
- Maximum 5 webhooks per Pro account

---

## Creating Webhooks

### API Endpoint

**POST** `https://go.shortedbro.xyz/api/webhooks`

### Request

```bash
curl -X POST https://go.shortedbro.xyz/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://api.yoursite.com/webhooks/shortedbro",
    "name": "Production Webhook",
    "events": ["link.clicked", "link.created", "link.updated", "link.deleted"],
    "slug": null
  }'
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Your webhook endpoint URL (must be HTTPS) |
| name | string | Yes | Friendly name for the webhook |
| events | array | Yes | Array of events to subscribe to |
| slug | string | No | Specific link slug to monitor (null for all links) |

### Response

```json
{
  "webhook_id": "wh_k8f3m2n9p4q7",
  "url": "https://api.yoursite.com/webhooks/shortedbro",
  "name": "Production Webhook",
  "events": ["link.clicked", "link.created", "link.updated", "link.deleted"],
  "slug": null,
  "secret": "whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "active": true,
  "message": "Webhook created successfully. Save the secret for signature verification."
}
```

**IMPORTANT:** Save the `secret` immediately! It will only be shown once and is required for signature verification.

---

## Webhook Events

### Available Events

| Event | Description | When Triggered |
|-------|-------------|----------------|
| `link.clicked` | A short link was clicked | Every click on any of your links |
| `link.created` | A new link was created | When you create a new short link |
| `link.updated` | A link was modified | When destination, slug, or settings change |
| `link.deleted` | A link was deleted | When a link is permanently removed |

### Event Selection Examples

**Track all activity:**
```json
{
  "events": ["link.clicked", "link.created", "link.updated", "link.deleted"]
}
```

**Track only clicks:**
```json
{
  "events": ["link.clicked"]
}
```

**Track link lifecycle:**
```json
{
  "events": ["link.created", "link.deleted"]
}
```

**Track specific link:**
```json
{
  "events": ["link.clicked"],
  "slug": "campaign-2025"
}
```

---

## Webhook Payloads

### HTTP Headers

Every webhook request includes these headers:

```
POST /your-webhook-endpoint HTTP/1.1
Host: api.yoursite.com
Content-Type: application/json
X-EdgeLink-Signature: a1b2c3d4e5f6...
X-EdgeLink-Event: link.clicked
User-Agent: EdgeLink-Webhooks/1.0
```

| Header | Description |
|--------|-------------|
| `X-EdgeLink-Signature` | HMAC-SHA256 signature of the payload |
| `X-EdgeLink-Event` | The event type that triggered this webhook |
| `User-Agent` | Always `EdgeLink-Webhooks/1.0` |

---

### link.clicked Payload

Sent every time a link is clicked.

```json
{
  "event": "link.clicked",
  "slug": "campaign-2025",
  "clicks": 1501,
  "timestamp": 1700000000000,
  "user_id": "usr_abc123def456"
}
```

| Field | Type | Description |
|-------|------|-------------|
| event | string | Always `link.clicked` |
| slug | string | The short link slug that was clicked |
| clicks | integer | Total click count after this click |
| timestamp | integer | Unix timestamp in milliseconds |
| user_id | string | Your user ID |

**Example Use Cases:**
- Update real-time analytics dashboards
- Trigger marketing automation workflows
- Send notifications when campaigns hit milestones
- Log clicks to your own analytics system

---

### link.created Payload

Sent when a new link is created.

```json
{
  "event": "link.created",
  "slug": "new-product-launch",
  "timestamp": 1700000000000,
  "user_id": "usr_abc123def456"
}
```

| Field | Type | Description |
|-------|------|-------------|
| event | string | Always `link.created` |
| slug | string | The newly created link slug |
| timestamp | integer | Unix timestamp in milliseconds |
| user_id | string | Your user ID |

**Example Use Cases:**
- Sync new links to your CRM
- Add links to spreadsheets or databases
- Notify team members of new campaigns
- Trigger approval workflows

---

### link.updated Payload

Sent when a link is modified.

```json
{
  "event": "link.updated",
  "slug": "updated-campaign",
  "timestamp": 1700000000000,
  "user_id": "usr_abc123def456"
}
```

| Field | Type | Description |
|-------|------|-------------|
| event | string | Always `link.updated` |
| slug | string | The updated link slug |
| timestamp | integer | Unix timestamp in milliseconds |
| user_id | string | Your user ID |

**Example Use Cases:**
- Keep external systems in sync
- Log changes for audit trails
- Update cached data
- Notify team of configuration changes

---

### link.deleted Payload

Sent when a link is deleted.

```json
{
  "event": "link.deleted",
  "slug": "old-campaign",
  "timestamp": 1700000000000,
  "user_id": "usr_abc123def456"
}
```

| Field | Type | Description |
|-------|------|-------------|
| event | string | Always `link.deleted` |
| slug | string | The deleted link slug |
| timestamp | integer | Unix timestamp in milliseconds |
| user_id | string | Your user ID |

**Example Use Cases:**
- Remove from external systems
- Archive analytics data
- Update internal records
- Send cleanup notifications

---

## Signature Verification

**Always verify webhook signatures to ensure requests come from ShortedBro.**

### How It Works

1. We create an HMAC-SHA256 hash of the raw request body using your webhook secret
2. We send this hash in the `X-EdgeLink-Signature` header
3. You create the same hash and compare it to verify authenticity

### Node.js / Express

```javascript
const crypto = require('crypto');
const express = require('express');

const app = express();
const WEBHOOK_SECRET = 'whsec_your_secret_here';

// IMPORTANT: Use raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-edgelink-signature'];
  const payload = req.body;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Parse and process event
  const event = JSON.parse(payload.toString());
  console.log(`Received ${event.event} for ${event.slug}`);

  // Always respond quickly with 200
  res.status(200).send('OK');

  // Process event asynchronously if needed
  processEvent(event).catch(console.error);
});

async function processEvent(event) {
  switch (event.event) {
    case 'link.clicked':
      await updateAnalytics(event.slug, event.clicks);
      break;
    case 'link.created':
      await syncToCRM(event.slug);
      break;
    case 'link.deleted':
      await archiveData(event.slug);
      break;
  }
}

app.listen(3000);
```

---

### Python / Flask

```python
import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = 'whsec_your_secret_here'

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    # Get raw body and signature
    payload = request.data
    signature = request.headers.get('X-EdgeLink-Signature', '')

    # Verify signature
    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return jsonify({'error': 'Invalid signature'}), 401

    # Parse event
    event = request.json
    event_type = event.get('event')
    slug = event.get('slug')

    print(f"Received {event_type} for {slug}")

    # Process based on event type
    if event_type == 'link.clicked':
        # Update your analytics
        clicks = event.get('clicks')
        update_analytics(slug, clicks)

    elif event_type == 'link.created':
        # Sync to your CRM or database
        sync_to_crm(slug)

    elif event_type == 'link.updated':
        # Update cached data
        invalidate_cache(slug)

    elif event_type == 'link.deleted':
        # Archive or cleanup
        archive_link_data(slug)

    return jsonify({'status': 'ok'}), 200

def update_analytics(slug, clicks):
    # Your analytics update logic
    pass

def sync_to_crm(slug):
    # Your CRM sync logic
    pass

def invalidate_cache(slug):
    # Your cache invalidation logic
    pass

def archive_link_data(slug):
    # Your archival logic
    pass

if __name__ == '__main__':
    app.run(port=3000)
```

---

### Python / Django

```python
import hmac
import hashlib
import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

WEBHOOK_SECRET = 'whsec_your_secret_here'

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@csrf_exempt
@require_POST
def webhook_handler(request):
    # Get raw body
    payload = request.body
    signature = request.headers.get('X-EdgeLink-Signature', '')

    # Verify signature
    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return JsonResponse({'error': 'Invalid signature'}, status=401)

    # Parse event
    event = json.loads(payload)

    # Handle event
    if event['event'] == 'link.clicked':
        # Process click
        handle_click(event['slug'], event['clicks'])

    elif event['event'] == 'link.created':
        # Process creation
        handle_creation(event['slug'])

    return HttpResponse('OK', status=200)

def handle_click(slug, clicks):
    # Your click handling logic
    from myapp.models import LinkStats
    LinkStats.objects.update_or_create(
        slug=slug,
        defaults={'clicks': clicks}
    )

def handle_creation(slug):
    # Your creation handling logic
    pass
```

---

### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io"
    "log"
    "net/http"
)

const webhookSecret = "whsec_your_secret_here"

type WebhookEvent struct {
    Event     string `json:"event"`
    Slug      string `json:"slug"`
    Clicks    int    `json:"clicks,omitempty"`
    Timestamp int64  `json:"timestamp"`
    UserID    string `json:"user_id"`
}

func verifySignature(payload []byte, signature string) bool {
    mac := hmac.New(sha256.New, []byte(webhookSecret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    // Read body
    payload, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read body", http.StatusBadRequest)
        return
    }

    // Get signature
    signature := r.Header.Get("X-EdgeLink-Signature")

    // Verify signature
    if !verifySignature(payload, signature) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Parse event
    var event WebhookEvent
    if err := json.Unmarshal(payload, &event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    log.Printf("Received %s for %s", event.Event, event.Slug)

    // Handle event
    switch event.Event {
    case "link.clicked":
        handleClick(event.Slug, event.Clicks)
    case "link.created":
        handleCreation(event.Slug)
    case "link.updated":
        handleUpdate(event.Slug)
    case "link.deleted":
        handleDeletion(event.Slug)
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func handleClick(slug string, clicks int) {
    // Your click handling logic
    log.Printf("Link %s clicked, total: %d", slug, clicks)
}

func handleCreation(slug string) {
    // Your creation handling logic
    log.Printf("Link %s created", slug)
}

func handleUpdate(slug string) {
    // Your update handling logic
    log.Printf("Link %s updated", slug)
}

func handleDeletion(slug string) {
    // Your deletion handling logic
    log.Printf("Link %s deleted", slug)
}

func main() {
    http.HandleFunc("/webhook", webhookHandler)
    log.Println("Webhook server listening on :3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}
```

---

### PHP

```php
<?php

$webhookSecret = 'whsec_your_secret_here';

// Get raw POST body
$payload = file_get_contents('php://input');

// Get signature from header
$signature = $_SERVER['HTTP_X_EDGELINK_SIGNATURE'] ?? '';

// Verify signature
$expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Parse event
$event = json_decode($payload, true);

// Log event
error_log("Received {$event['event']} for {$event['slug']}");

// Handle event
switch ($event['event']) {
    case 'link.clicked':
        handleClick($event['slug'], $event['clicks']);
        break;

    case 'link.created':
        handleCreation($event['slug']);
        break;

    case 'link.updated':
        handleUpdate($event['slug']);
        break;

    case 'link.deleted':
        handleDeletion($event['slug']);
        break;
}

// Respond with success
http_response_code(200);
echo 'OK';

function handleClick($slug, $clicks) {
    // Update database with click count
    // Example: UPDATE link_stats SET clicks = ? WHERE slug = ?
}

function handleCreation($slug) {
    // Sync new link to your system
}

function handleUpdate($slug) {
    // Update cached data
}

function handleDeletion($slug) {
    // Archive or cleanup
}
```

---

### Ruby / Sinatra

```ruby
require 'sinatra'
require 'openssl'
require 'json'

WEBHOOK_SECRET = 'whsec_your_secret_here'

def verify_signature(payload, signature)
  expected = OpenSSL::HMAC.hexdigest('SHA256', WEBHOOK_SECRET, payload)
  Rack::Utils.secure_compare(expected, signature)
end

post '/webhook' do
  # Read raw body
  request.body.rewind
  payload = request.body.read

  # Get signature
  signature = request.env['HTTP_X_EDGELINK_SIGNATURE'] || ''

  # Verify signature
  unless verify_signature(payload, signature)
    halt 401, { error: 'Invalid signature' }.to_json
  end

  # Parse event
  event = JSON.parse(payload)

  puts "Received #{event['event']} for #{event['slug']}"

  # Handle event
  case event['event']
  when 'link.clicked'
    handle_click(event['slug'], event['clicks'])
  when 'link.created'
    handle_creation(event['slug'])
  when 'link.updated'
    handle_update(event['slug'])
  when 'link.deleted'
    handle_deletion(event['slug'])
  end

  status 200
  'OK'
end

def handle_click(slug, clicks)
  # Your click handling logic
end

def handle_creation(slug)
  # Your creation handling logic
end

def handle_update(slug)
  # Your update handling logic
end

def handle_deletion(slug)
  # Your deletion handling logic
end
```

---

### C# / ASP.NET Core

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

[ApiController]
[Route("webhook")]
public class WebhookController : ControllerBase
{
    private const string WebhookSecret = "whsec_your_secret_here";

    [HttpPost]
    public async Task<IActionResult> HandleWebhook()
    {
        // Read raw body
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();

        // Get signature
        var signature = Request.Headers["X-EdgeLink-Signature"].ToString();

        // Verify signature
        if (!VerifySignature(payload, signature))
        {
            return Unauthorized(new { error = "Invalid signature" });
        }

        // Parse event
        var eventData = JsonSerializer.Deserialize<WebhookEvent>(payload);

        Console.WriteLine($"Received {eventData.Event} for {eventData.Slug}");

        // Handle event
        switch (eventData.Event)
        {
            case "link.clicked":
                await HandleClick(eventData.Slug, eventData.Clicks);
                break;
            case "link.created":
                await HandleCreation(eventData.Slug);
                break;
            case "link.updated":
                await HandleUpdate(eventData.Slug);
                break;
            case "link.deleted":
                await HandleDeletion(eventData.Slug);
                break;
        }

        return Ok("OK");
    }

    private bool VerifySignature(string payload, string signature)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(WebhookSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expected = BitConverter.ToString(hash).Replace("-", "").ToLower();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature)
        );
    }

    private Task HandleClick(string slug, int clicks)
    {
        // Your click handling logic
        return Task.CompletedTask;
    }

    private Task HandleCreation(string slug)
    {
        // Your creation handling logic
        return Task.CompletedTask;
    }

    private Task HandleUpdate(string slug)
    {
        // Your update handling logic
        return Task.CompletedTask;
    }

    private Task HandleDeletion(string slug)
    {
        // Your deletion handling logic
        return Task.CompletedTask;
    }
}

public class WebhookEvent
{
    public string Event { get; set; }
    public string Slug { get; set; }
    public int Clicks { get; set; }
    public long Timestamp { get; set; }
    public string UserId { get; set; }
}
```

---

## Handling Webhooks

### Respond Quickly

Always respond with a 2xx status code within 30 seconds. Process events asynchronously.

```javascript
// Good - respond immediately, process later
app.post('/webhook', (req, res) => {
  res.status(200).send('OK');

  // Process asynchronously
  processEvent(req.body).catch(console.error);
});

// Bad - slow processing blocks response
app.post('/webhook', async (req, res) => {
  await slowDatabaseOperation(); // Don't do this!
  res.status(200).send('OK');
});
```

### Use a Queue

For high-volume webhooks, use a message queue:

```javascript
const { Queue } = require('bull');

const webhookQueue = new Queue('webhooks', 'redis://localhost:6379');

app.post('/webhook', (req, res) => {
  // Respond immediately
  res.status(200).send('OK');

  // Queue for processing
  webhookQueue.add(req.body);
});

// Process queue
webhookQueue.process(async (job) => {
  const event = job.data;

  switch (event.event) {
    case 'link.clicked':
      await updateAnalytics(event.slug, event.clicks);
      break;
    // ... handle other events
  }
});
```

### Idempotency

Webhooks may be delivered more than once. Make your handlers idempotent:

```javascript
// Good - idempotent
async function handleClick(slug, clicks) {
  // Set to exact value, not increment
  await db.query(
    'UPDATE stats SET clicks = $1 WHERE slug = $2',
    [clicks, slug]
  );
}

// Bad - not idempotent
async function handleClick(slug) {
  // Incrementing will cause issues on retry
  await db.query(
    'UPDATE stats SET clicks = clicks + 1 WHERE slug = $1',
    [slug]
  );
}
```

---

## Best Practices

### 1. Always Verify Signatures

Never skip signature verification, even in development:

```javascript
if (process.env.NODE_ENV !== 'test') {
  if (!verifySignature(payload, signature)) {
    return res.status(401).send('Invalid signature');
  }
}
```

### 2. Use HTTPS

Your webhook endpoint must use HTTPS. We don't send webhooks to HTTP endpoints.

### 3. Handle Retries

We retry failed webhooks up to 7 times with exponential backoff:

| Attempt | Delay After Failure |
|---------|-------------------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 1 hour |
| 6 | 3 hours |
| 7 | 6 hours |

### 4. Log Everything

Log webhook events for debugging:

```javascript
app.post('/webhook', (req, res) => {
  const event = req.body;

  console.log({
    event: event.event,
    slug: event.slug,
    timestamp: event.timestamp,
    received_at: Date.now()
  });

  // Process event...
});
```

### 5. Monitor Failures

Set up alerts for webhook processing failures:

```javascript
app.post('/webhook', async (req, res) => {
  try {
    await processEvent(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed:', error);

    // Alert your monitoring system
    await alerting.notify({
      type: 'webhook_failure',
      error: error.message,
      event: req.body
    });

    // Still return 200 to prevent retries if it's your bug
    res.status(200).send('OK');
  }
});
```

### 6. Test Locally

Use ngrok or similar tools to test webhooks locally:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
node server.js

# Expose it publicly
ngrok http 3000

# Use the ngrok URL as your webhook endpoint
# https://abc123.ngrok.io/webhook
```

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook status**: Use `GET /api/webhooks` to verify it's active
2. **Verify URL**: Ensure your endpoint is publicly accessible
3. **Check HTTPS**: Webhooks only work with HTTPS endpoints
4. **Check firewall**: Ensure your server accepts POST requests

### Invalid Signature Errors

1. **Use raw body**: Don't parse JSON before verifying
2. **Check secret**: Ensure you're using the correct webhook secret
3. **Encoding**: Use UTF-8 encoding for all strings

```javascript
// Wrong - using parsed body
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(parsedBody)) // Wrong!
  .digest('hex');

// Right - using raw body
const signature = crypto
  .createHmac('sha256', secret)
  .update(rawBody) // Correct!
  .digest('hex');
```

### Timeouts

If your handler takes too long:

1. Respond immediately with 200
2. Process asynchronously
3. Use a message queue for heavy processing

### Missing Events

1. Check your event subscription list
2. Verify the slug filter if using one
3. Check your server logs for errors

---

## Example Integrations

### Slack Notifications

```javascript
const axios = require('axios');

async function sendSlackNotification(event) {
  const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/...';

  let message;

  switch (event.event) {
    case 'link.clicked':
      if (event.clicks % 100 === 0) { // Notify every 100 clicks
        message = `Link *${event.slug}* reached ${event.clicks} clicks!`;
      }
      break;

    case 'link.created':
      message = `New link created: *${event.slug}*`;
      break;
  }

  if (message) {
    await axios.post(SLACK_WEBHOOK_URL, { text: message });
  }
}
```

### Google Analytics

```javascript
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

async function sendToGoogleAnalytics(event) {
  if (event.event !== 'link.clicked') return;

  const measurementId = 'G-XXXXXXXX';
  const apiSecret = 'your-api-secret';

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client_id: event.user_id,
        events: [{
          name: 'link_click',
          params: {
            slug: event.slug,
            total_clicks: event.clicks
          }
        }]
      })
    }
  );
}
```

### Database Sync

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function syncToDatabase(event) {
  switch (event.event) {
    case 'link.clicked':
      await pool.query(
        `INSERT INTO link_clicks (slug, clicks, timestamp)
         VALUES ($1, $2, to_timestamp($3 / 1000))
         ON CONFLICT (slug)
         DO UPDATE SET clicks = $2, timestamp = to_timestamp($3 / 1000)`,
        [event.slug, event.clicks, event.timestamp]
      );
      break;

    case 'link.created':
      await pool.query(
        `INSERT INTO links (slug, created_at)
         VALUES ($1, to_timestamp($2 / 1000))`,
        [event.slug, event.timestamp]
      );
      break;

    case 'link.deleted':
      await pool.query(
        `UPDATE links SET deleted_at = to_timestamp($2 / 1000)
         WHERE slug = $1`,
        [event.slug, event.timestamp]
      );
      break;
  }
}
```

---

## Support

For questions or issues:

- **Documentation:** https://shortedbro.xyz/docs
- **Email:** support@shortedbro.xyz

---

*Last updated: November 2025*
