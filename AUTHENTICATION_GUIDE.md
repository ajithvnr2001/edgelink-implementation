# EdgeLink Authentication Guide

## Quick Start

### ✅ Your API Key Should Work Now!

If you have an API key (starts with `elk_`), you can use it directly:

```python
import requests

headers = {
    "Authorization": "Bearer elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr"
}

response = requests.get(
    "https://go.shortedbro.xyz/api/links",
    headers=headers
)

print(response.json())
```

---

## Two Authentication Methods

### Method 1: API Key (Recommended for Scripts)

**Best for:**
- Python scripts
- Automation
- CI/CD pipelines
- Long-running services

**Format:** `elk_` + 32 alphanumeric characters

**Lifespan:** Up to 1 year (customizable)

**Example:**
```python
API_KEY = "elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}
```

---

### Method 2: JWT Token (For User Sessions)

**Best for:**
- Web applications
- Mobile apps
- Interactive sessions

**Format:** Standard JWT format (3 parts separated by dots)

**Lifespan:** 24 hours

**How to get:**
```python
import requests

# Login
response = requests.post(
    "https://go.shortedbro.xyz/auth/login",
    json={
        "email": "your@email.com",
        "password": "yourpassword"
    }
)

jwt_token = response.json()["token"]

# Use it
headers = {
    "Authorization": f"Bearer {jwt_token}"
}
```

---

## Common Issues & Solutions

### Issue 1: "Invalid JWT format" with API Key

**Problem:** You're using an API key but getting JWT validation errors.

**Solution:** This was a bug that has been fixed! API keys now work directly. Just ensure:
1. Your key starts with `elk_`
2. You're using `Bearer` authentication
3. Your key hasn't expired

**Test your key:**
```python
import requests

response = requests.get(
    "https://go.shortedbro.xyz/api/keys",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)

if response.status_code == 200:
    print("✅ API key is valid!")
    print(response.json())
else:
    print(f"❌ Error: {response.status_code}")
    print(response.json())
```

---

### Issue 2: "Invalid or expired API key"

**Causes:**
- API key has expired
- API key was revoked
- Incorrect key (typo)

**Solution:**
1. Check if key is expired:
   ```bash
   curl -X GET https://go.shortedbro.xyz/api/keys \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. Generate a new key if needed (requires JWT):
   ```bash
   curl -X POST https://go.shortedbro.xyz/api/keys \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "New API Key", "expires_in_days": 365}'
   ```

---

### Issue 3: Don't have an API key or JWT?

**Option A: Get a JWT token (if you have an account)**

```python
import requests

response = requests.post(
    "https://go.shortedbro.xyz/auth/login",
    json={
        "email": "your@email.com",
        "password": "yourpassword"
    }
)

if response.status_code == 200:
    jwt_token = response.json()["token"]
    print(f"JWT Token: {jwt_token}")
else:
    print("Login failed:", response.json())
```

**Option B: Create a new account**

```python
import requests

response = requests.post(
    "https://go.shortedbro.xyz/auth/signup",
    json={
        "email": "new@email.com",
        "password": "securepassword",
        "plan": "free"
    }
)

if response.status_code == 201:
    jwt_token = response.json()["token"]
    print(f"Account created! JWT Token: {jwt_token}")
else:
    print("Signup failed:", response.json())
```

**Option C: Generate an API key (requires JWT first)**

```python
import requests

# Step 1: Login to get JWT
jwt_response = requests.post(
    "https://go.shortedbro.xyz/auth/login",
    json={"email": "your@email.com", "password": "yourpassword"}
)

jwt_token = jwt_response.json()["token"]

# Step 2: Generate API key
api_key_response = requests.post(
    "https://go.shortedbro.xyz/api/keys",
    headers={"Authorization": f"Bearer {jwt_token}"},
    json={"name": "My Python Script", "expires_in_days": 365}
)

if api_key_response.status_code == 201:
    api_key = api_key_response.json()["api_key"]
    print(f"✅ API Key Generated: {api_key}")
    print("⚠️  SAVE THIS KEY - YOU WON'T SEE IT AGAIN!")
else:
    print("Failed:", api_key_response.json())
```

---

## Working Example (Copy & Paste)

```python
import requests

# Configuration
BASE_URL = "https://go.shortedbro.xyz"
API_KEY = "elk_YOUR_API_KEY_HERE"  # Replace with your actual API key

# Headers
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# Test 1: List all links
print("📋 Listing all links...")
response = requests.get(f"{BASE_URL}/api/links", headers=headers)
print(f"Status: {response.status_code}")
print(response.json())

# Test 2: Create a short link
print("\n🔗 Creating a short link...")
response = requests.post(
    f"{BASE_URL}/api/shorten",
    headers=headers,
    json={"url": "https://example.com"}
)
print(f"Status: {response.status_code}")
print(response.json())

# Test 3: Get analytics for a slug
slug = "YOUR_SLUG_HERE"  # Replace with actual slug
print(f"\n📊 Getting analytics for {slug}...")
response = requests.get(
    f"{BASE_URL}/api/analytics/{slug}?range=7d",
    headers=headers
)
print(f"Status: {response.status_code}")
print(response.json())
```

---

## API Key Management

### List all your API keys
```bash
curl -X GET https://go.shortedbro.xyz/api/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate a new API key
```bash
curl -X POST https://go.shortedbro.xyz/api/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Script",
    "expires_in_days": 365
  }'
```

### Revoke an API key
```bash
curl -X DELETE https://go.shortedbro.xyz/api/keys/key_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Security Best Practices

1. **Never commit API keys to version control**
   ```python
   # ❌ Bad
   API_KEY = "elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr"

   # ✅ Good
   import os
   API_KEY = os.getenv("EDGELINK_API_KEY")
   ```

2. **Use environment variables**
   ```bash
   export EDGELINK_API_KEY="elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr"
   ```

3. **Rotate keys regularly**
   - Generate new keys every 3-6 months
   - Revoke old keys after migration

4. **Use descriptive names**
   - ✅ "Production CI/CD Pipeline"
   - ✅ "Development Testing Script"
   - ❌ "Key 1"

5. **Monitor key usage**
   - Check `last_used_at` field regularly
   - Revoke unused keys

---

## Rate Limits

- **Free plan:** 1,000 requests/day
- **Pro plan:** 10,000 requests/day

Rate limit headers in every response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1699564800
```

---

## Need Help?

- **Full API Documentation:** See `API_DOCUMENTATION.md`
- **Python Client:** See `examples/python_api_client.py`
- **Quick Reference:** See `API_QUICK_REFERENCE.md`
- **Support:** support@edgelink.dev
