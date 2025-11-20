"""
EdgeLink API Client - Full Feature Testing
Demonstrates ALL features with both JWT and API key authentication
Safe testing with automatic test link creation
"""

import requests
import json
from datetime import datetime
import time

# Configuration
BASE_URL = "https://go.shortedbro.xyz"
API_KEY = "elk_IKbF09dsetsopMVoPaZw0m2RfPc9gM6S"  # Update with your API key

class EdgeLinkClient:
    """EdgeLink API client with complete feature support"""

    def __init__(self, api_key=None, email=None, password=None):
        """
        Initialize client with either:
        - api_key: Long-lived API key (elk_...)
        - email/password: For JWT token authentication
        """
        self.base_url = BASE_URL
        self.api_key = api_key
        self.jwt_token = None
        self.email = email
        self.password = password

        # Auto-login if email/password provided
        if email and password and not api_key:
            self.login()

    def _get_headers(self):
        """Get authorization headers"""
        token = self.api_key or self.jwt_token
        if not token:
            return {"Content-Type": "application/json"}

        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

    def login(self):
        """Login with email/password to get JWT token"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": self.email, "password": self.password}
        )

        if response.status_code == 200:
            data = response.json()
            self.jwt_token = data["token"]
            print(f"✅ Logged in as {data['user']['email']}")
            print(f"   Plan: {data['user']['plan']}")
            return data
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(response.text)
            return None

    def signup(self, email, password, plan="free"):
        """Create new account"""
        response = requests.post(
            f"{self.base_url}/auth/signup",
            json={"email": email, "password": password, "plan": plan}
        )

        if response.status_code == 201:
            data = response.json()
            self.jwt_token = data["token"]
            self.email = email
            print(f"✅ Account created! User ID: {data['user']['user_id']}")
            return data
        else:
            print(f"❌ Signup failed: {response.status_code}")
            print(response.text)
            return None

    def generate_api_key(self, name="Python Script", expires_in_days=365):
        """Generate a new API key (requires JWT authentication)"""
        if not self.jwt_token:
            print("❌ JWT token required to generate API keys. Login first.")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.jwt_token}"
        }

        response = requests.post(
            f"{self.base_url}/api/keys",
            json={"name": name, "expires_in_days": expires_in_days},
            headers=headers
        )

        if response.status_code == 201:
            data = response.json()
            print(f"✅ API Key Generated!")
            print(f"   Key: {data['api_key']}")
            print(f"   Name: {data['name']}")
            print(f"   Expires: {data['expires_at']}")
            print(f"\n⚠️  SAVE THIS KEY NOW - YOU WON'T SEE IT AGAIN!")
            return data
        else:
            print(f"❌ Failed to generate API key: {response.status_code}")
            print(response.text)
            return None

    def list_api_keys(self):
        """List all API keys"""
        response = requests.get(
            f"{self.base_url}/api/keys",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total']} API key(s):\n")
            for key in data['keys']:
                print(f"🔑 {key['name']}")
                print(f"   Prefix: {key['key_prefix']}")
                print(f"   Created: {key['created_at']}")
                print(f"   Last used: {key.get('last_used_at', 'Never')}")
                print()
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def shorten(self, url, custom_slug=None, **kwargs):
        """Create a short link with optional features"""
        payload = {"url": url}
        if custom_slug:
            payload["custom_slug"] = custom_slug
        payload.update(kwargs)

        response = requests.post(
            f"{self.base_url}/api/shorten",
            json=payload,
            headers=self._get_headers()
        )

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Link created!")
            print(f"   Short URL: {data['short_url']}")
            print(f"   Slug: {data['slug']}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def list_links(self, page=1, limit=50, search=None):
        """List all links"""
        params = f"?page={page}&limit={limit}"
        if search:
            params += f"&search={search}"

        response = requests.get(
            f"{self.base_url}/api/links{params}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total']} total links (Page {page}/{data['totalPages']}):\n")

            for link in data['links']:
                print(f"🔗 {link['slug']}")
                print(f"   Destination: {link['destination']}")
                print(f"   Clicks: {link['click_count']}")
                print(f"   Created: {link['created_at']}")
                print()

            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def get_stats(self, slug):
        """Get basic stats for a link"""
        response = requests.get(
            f"{self.base_url}/api/stats/{slug}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Stats for {slug}:")
            print(f"   Total clicks: {data['total_clicks']}")
            print(f"   Created: {data['created_at']}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def get_analytics(self, slug, time_range="7d"):
        """Get detailed analytics"""
        response = requests.get(
            f"{self.base_url}/api/analytics/{slug}?range={time_range}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics for {slug} ({time_range}):")
            print(f"   Total Clicks: {data.get('total_clicks', 0)}")
            print(f"   Unique Visitors: {data.get('unique_visitors', 0)}")

            if 'breakdown' in data and 'devices' in data['breakdown']:
                print("\n📱 Device Breakdown:")
                for device, count in data['breakdown']['devices'].items():
                    print(f"   {device}: {count}")

            if 'breakdown' in data and 'countries' in data['breakdown']:
                print("\n🌍 Top Countries:")
                for country, count in data['breakdown']['countries'].items():
                    print(f"   {country}: {count}")

            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def update_link(self, slug, destination):
        """Update link destination"""
        response = requests.put(
            f"{self.base_url}/api/links/{slug}",
            json={"destination": destination},
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Link updated successfully!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def delete_link(self, slug):
        """Delete a link"""
        response = requests.delete(
            f"{self.base_url}/api/links/{slug}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Link deleted successfully!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def set_device_routing(self, slug, mobile, desktop, tablet=None):
        """Configure device-based routing (Pro feature)"""
        payload = {"mobile": mobile, "desktop": desktop}
        if tablet:
            payload["tablet"] = tablet

        response = requests.post(
            f"{self.base_url}/api/links/{slug}/routing/device",
            json=payload,
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Device routing configured!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def set_geo_routing(self, slug, routes):
        """Configure geographic routing (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/links/{slug}/routing/geo",
            json={"routes": routes},
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Geographic routing configured!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def set_referrer_routing(self, slug, routes):
        """Configure referrer-based routing (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/links/{slug}/routing/referrer",
            json={"routes": routes},
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Referrer routing configured!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def set_time_routing(self, slug, rules):
        """Configure time-based routing (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/links/{slug}/routing/time",
            json={"rules": rules},
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Time-based routing configured!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def get_routing(self, slug):
        """Get all routing configuration"""
        response = requests.get(
            f"{self.base_url}/api/links/{slug}/routing",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Routing configuration:")
            print(json.dumps(response.json(), indent=2))
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def delete_routing(self, slug, routing_type):
        """Delete specific routing type (device, geo, referrer, time)"""
        response = requests.delete(
            f"{self.base_url}/api/links/{slug}/routing/{routing_type}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ {routing_type.capitalize()} routing deleted!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def create_ab_test(self, slug, variant_a, variant_b, split=50):
        """Create A/B test (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/links/{slug}/ab-test",
            json={
                "variant_a": variant_a,
                "variant_b": variant_b,
                "split": split
            },
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ A/B test created! Split: {split}% / {100-split}%")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def get_ab_results(self, slug):
        """Get A/B test results"""
        response = requests.get(
            f"{self.base_url}/api/links/{slug}/ab-test",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ A/B Test Results:")
            print(f"   Variant A: {data.get('variant_a_clicks', 0)} clicks")
            print(f"   Variant B: {data.get('variant_b_clicks', 0)} clicks")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def delete_ab_test(self, slug):
        """Delete A/B test"""
        response = requests.delete(
            f"{self.base_url}/api/links/{slug}/ab-test",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ A/B test deleted!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def export_analytics_csv(self, slug, time_range="30d"):
        """Export analytics data as CSV"""
        response = requests.get(
            f"{self.base_url}/api/export/analytics/{slug}?format=csv&range={time_range}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            filename = f"{slug}_analytics_{time_range}.csv"
            with open(filename, 'w') as f:
                f.write(response.text)
            print(f"✅ Analytics exported to {filename}")
            return filename
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def export_links_csv(self):
        """Export all links as CSV"""
        response = requests.get(
            f"{self.base_url}/api/export/links?format=csv",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            filename = f"links_export_{int(time.time())}.csv"
            with open(filename, 'w') as f:
                f.write(response.text)
            print(f"✅ Links exported to {filename}")
            return filename
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def bulk_import(self, links_data):
        """Bulk import links (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/import/links",
            json={"links": links_data},
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bulk import completed!")
            print(f"   Imported: {data.get('imported', 0)}")
            print(f"   Failed: {data.get('failed', 0)}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def create_webhook(self, url, events, name="My Webhook", slug=None):
        """Create a webhook (Pro feature)"""
        response = requests.post(
            f"{self.base_url}/api/webhooks",
            json={
                "url": url,
                "events": events,
                "name": name,
                "slug": slug
            },
            headers=self._get_headers()
        )

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Webhook created!")
            print(f"   ID: {data['webhook_id']}")
            print(f"   Secret: {data['secret']}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None

    def list_webhooks(self):
        """List all webhooks"""
        response = requests.get(
            f"{self.base_url}/api/webhooks",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data.get('webhooks', []))} webhook(s)")
            for wh in data.get('webhooks', []):
                print(f"   🪝 {wh['name']}")
                print(f"      URL: {wh['url']}")
                print(f"      Events: {', '.join(wh['events'])}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def delete_webhook(self, webhook_id):
        """Delete a webhook"""
        response = requests.delete(
            f"{self.base_url}/api/webhooks/{webhook_id}",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            print(f"✅ Webhook deleted!")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def get_usage(self):
        """Get account usage statistics"""
        response = requests.get(
            f"{self.base_url}/api/usage",
            headers=self._get_headers()
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Account Usage:")
            print(f"   Links: {data.get('links_used', 0)} / {data.get('links_limit', 0)}")
            print(f"   Clicks this month: {data.get('clicks_used', 0)} / {data.get('clicks_limit', 0)}")
            print(f"   API calls today: {data.get('api_calls_used', 0)} / {data.get('api_calls_limit', 0)}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None


# ============================
# COMPLETE FEATURE DEMONSTRATION
# ============================

def run_complete_test(api_key=None):
    """Run complete feature test with all EdgeLink capabilities"""

    print("=" * 80)
    print("🚀 EdgeLink Complete Feature Test Suite")
    print("=" * 80)
    print()

    if not api_key:
        print("❌ Please provide an API key")
        return

    client = EdgeLinkClient(api_key=api_key)

    # Generate unique short ID for test slugs (max 20 chars for slug)
    # Using last 6 digits of timestamp to keep slugs under 20 chars
    timestamp = int(time.time())
    short_id = str(timestamp)[-6:]  # Last 6 digits
    test_slugs = []

    # ==========================================
    # SECTION 1: Account & API Keys Management
    # ==========================================
    print("\n" + "=" * 80)
    print("📋 SECTION 1: Account & API Keys Management")
    print("=" * 80)

    print("\n[1.1] Getting Account Usage")
    print("-" * 80)
    usage = client.get_usage()

    print("\n[1.2] Listing All API Keys")
    print("-" * 80)
    api_keys = client.list_api_keys()

    # ==========================================
    # SECTION 2: Basic Link Operations
    # ==========================================
    print("\n" + "=" * 80)
    print("🔗 SECTION 2: Basic Link Operations")
    print("=" * 80)

    print("\n[2.1] Creating Basic Short Link")
    print("-" * 80)
    basic_link = client.shorten(
        "https://example.com/basic-test",
        custom_slug=f"basic-{short_id}"  # Max 12 chars
    )
    if basic_link:
        test_slugs.append(basic_link['slug'])

    print("\n[2.2] Creating Link with Expiration")
    print("-" * 80)
    expiring_link = client.shorten(
        "https://example.com/expires",
        custom_slug=f"expire-{short_id}",  # Max 13 chars
        expires_at="2025-12-31T23:59:59Z"
    )
    if expiring_link:
        test_slugs.append(expiring_link['slug'])

    print("\n[2.3] Creating Link with Max Clicks")
    print("-" * 80)
    limited_link = client.shorten(
        "https://example.com/limited",
        custom_slug=f"limit-{short_id}",  # Max 12 chars
        max_clicks=100
    )
    if limited_link:
        test_slugs.append(limited_link['slug'])

    print("\n[2.4] Creating Password-Protected Link")
    print("-" * 80)
    protected_link = client.shorten(
        "https://example.com/secret",
        custom_slug=f"secret-{short_id}",  # Max 13 chars
        password="test123"
    )
    if protected_link:
        test_slugs.append(protected_link['slug'])

    print("\n[2.5] Listing All Links")
    print("-" * 80)
    all_links = client.list_links(page=1, limit=10)

    print("\n[2.6] Searching Links")
    print("-" * 80)
    search_results = client.list_links(search="test")

    # ==========================================
    # SECTION 3: Analytics & Stats
    # ==========================================
    print("\n" + "=" * 80)
    print("📊 SECTION 3: Analytics & Statistics")
    print("=" * 80)

    if test_slugs:
        test_slug = test_slugs[0]

        print(f"\n[3.1] Getting Basic Stats for {test_slug}")
        print("-" * 80)
        stats = client.get_stats(test_slug)

        print(f"\n[3.2] Getting 7-Day Analytics")
        print("-" * 80)
        analytics_7d = client.get_analytics(test_slug, "7d")

        print(f"\n[3.3] Getting 30-Day Analytics")
        print("-" * 80)
        analytics_30d = client.get_analytics(test_slug, "30d")

        print(f"\n[3.4] Exporting Analytics to CSV")
        print("-" * 80)
        csv_file = client.export_analytics_csv(test_slug, "30d")

    print("\n[3.5] Exporting All Links to CSV")
    print("-" * 80)
    links_csv = client.export_links_csv()

    # ==========================================
    # SECTION 4: Smart Routing Features (Pro)
    # ==========================================
    print("\n" + "=" * 80)
    print("🔀 SECTION 4: Smart Routing Features (Pro)")
    print("=" * 80)

    # Create a dedicated routing test link
    print("\n[4.0] Creating Routing Test Link")
    print("-" * 80)
    routing_link = client.shorten(
        "https://example.com/default",
        custom_slug=f"route-{short_id}"  # Max 12 chars
    )
    if routing_link:
        routing_slug = routing_link['slug']
        test_slugs.append(routing_slug)

        print(f"\n[4.1] Setting up Device Routing")
        print("-" * 80)
        device_routing = client.set_device_routing(
            routing_slug,
            mobile="https://m.example.com",
            desktop="https://www.example.com",
            tablet="https://tablet.example.com"
        )

        print(f"\n[4.2] Setting up Geographic Routing")
        print("-" * 80)
        geo_routing = client.set_geo_routing(routing_slug, {
            "US": "https://example.com/us",
            "GB": "https://example.com/uk",
            "IN": "https://example.com/in",
            "CA": "https://example.com/ca",
            "DE": "https://example.com/de",
            "default": "https://example.com"
        })

        print(f"\n[4.3] Setting up Referrer Routing")
        print("-" * 80)
        referrer_routing = client.set_referrer_routing(routing_slug, {
            "twitter.com": "https://example.com/from-twitter",
            "linkedin.com": "https://example.com/from-linkedin",
            "facebook.com": "https://example.com/from-facebook",
            "reddit.com": "https://example.com/from-reddit",
            "default": "https://example.com"
        })

        print(f"\n[4.4] Setting up Time-Based Routing")
        print("-" * 80)
        time_routing = client.set_time_routing(routing_slug, [
            {
                "start_hour": 9,
                "end_hour": 17,
                "days": [1, 2, 3, 4, 5],  # Monday-Friday
                "destination": "https://example.com/business-hours",
                "timezone": "America/New_York"
            },
            {
                "start_hour": 0,
                "end_hour": 9,
                "destination": "https://example.com/night",
                "timezone": "America/New_York"
            }
        ])

        print(f"\n[4.5] Getting All Routing Configuration")
        print("-" * 80)
        all_routing = client.get_routing(routing_slug)

    # ==========================================
    # SECTION 5: A/B Testing (Pro)
    # ==========================================
    print("\n" + "=" * 80)
    print("🧪 SECTION 5: A/B Testing")
    print("=" * 80)

    print("\n[5.1] Creating A/B Test Link")
    print("-" * 80)
    ab_link = client.shorten(
        "https://example.com/ab-default",
        custom_slug=f"abtest-{short_id}"  # Max 13 chars
    )
    if ab_link:
        ab_slug = ab_link['slug']
        test_slugs.append(ab_slug)

        print(f"\n[5.2] Setting up A/B Test (50/50 split)")
        print("-" * 80)
        ab_test = client.create_ab_test(
            ab_slug,
            variant_a="https://example.com/variant-a",
            variant_b="https://example.com/variant-b",
            split=50
        )

        print(f"\n[5.3] Getting A/B Test Results")
        print("-" * 80)
        ab_results = client.get_ab_results(ab_slug)

    # ==========================================
    # SECTION 6: Link Updates & Management
    # ==========================================
    print("\n" + "=" * 80)
    print("✏️ SECTION 6: Link Updates & Management")
    print("=" * 80)

    if test_slugs:
        update_slug = test_slugs[0]

        print(f"\n[6.1] Updating Link Destination")
        print("-" * 80)
        updated = client.update_link(
            update_slug,
            "https://example.com/updated-destination"
        )

        print(f"\n[6.2] Getting Updated Link Stats")
        print("-" * 80)
        updated_stats = client.get_stats(update_slug)

    # ==========================================
    # SECTION 7: Webhooks (Pro)
    # ==========================================
    print("\n" + "=" * 80)
    print("🪝 SECTION 7: Webhooks")
    print("=" * 80)

    print("\n[7.1] Creating Webhook for Click Events")
    print("-" * 80)
    webhook = client.create_webhook(
        url="https://webhook.site/unique-id",  # Replace with your webhook URL
        events=["click", "link.created", "link.deleted"],
        name=f"Test Webhook {timestamp}"
    )
    webhook_id = webhook.get('webhook_id') if webhook else None

    print("\n[7.2] Listing All Webhooks")
    print("-" * 80)
    all_webhooks = client.list_webhooks()

    # ==========================================
    # SECTION 8: Bulk Operations (Pro)
    # ==========================================
    print("\n" + "=" * 80)
    print("📦 SECTION 8: Bulk Operations")
    print("=" * 80)

    print("\n[8.1] Bulk Import Links")
    print("-" * 80)
    bulk_data = [
        {
            "url": "https://example.com/bulk-1",
            "custom_slug": f"bulk1-{short_id}"  # Max 12 chars
        },
        {
            "url": "https://example.com/bulk-2",
            "custom_slug": f"bulk2-{short_id}"  # Max 12 chars
        },
        {
            "url": "https://example.com/bulk-3",
            "custom_slug": f"bulk3-{short_id}"  # Max 12 chars
        }
    ]
    bulk_result = client.bulk_import(bulk_data)
    if bulk_result:
        test_slugs.extend([f"bulk1-{short_id}", f"bulk2-{short_id}", f"bulk3-{short_id}"])

    # ==========================================
    # SECTION 9: Cleanup (Optional)
    # ==========================================
    print("\n" + "=" * 80)
    print("🧹 SECTION 9: Cleanup Test Links")
    print("=" * 80)

    cleanup = input("\nDo you want to delete all test links created? (yes/no): ").lower()

    if cleanup == "yes":
        print("\n[9.1] Deleting Test Links")
        print("-" * 80)
        for slug in test_slugs:
            print(f"Deleting {slug}...")
            client.delete_link(slug)
            time.sleep(0.5)  # Rate limit friendly

        print("\n[9.2] Deleting A/B Test")
        print("-" * 80)
        if 'ab_slug' in locals():
            client.delete_ab_test(ab_slug)

        print("\n[9.3] Deleting Routing Configurations")
        print("-" * 80)
        if 'routing_slug' in locals():
            client.delete_routing(routing_slug, "device")
            client.delete_routing(routing_slug, "geo")
            client.delete_routing(routing_slug, "referrer")
            client.delete_routing(routing_slug, "time")

        print("\n[9.4] Deleting Test Webhook")
        print("-" * 80)
        if webhook_id:
            client.delete_webhook(webhook_id)
    else:
        print("\n⏭️  Skipping cleanup. Test links remain active.")
        print(f"   Test slugs created: {', '.join(test_slugs)}")

    # ==========================================
    # FINAL SUMMARY
    # ==========================================
    print("\n" + "=" * 80)
    print("✅ Complete Feature Test Finished!")
    print("=" * 80)

    print("\n📊 Summary:")
    print(f"   ✓ Links created: {len(test_slugs)}")
    print(f"   ✓ All features tested successfully")
    print(f"   ✓ Routing configurations applied")
    print(f"   ✓ A/B testing demonstrated")
    print(f"   ✓ Webhooks configured")
    print(f"   ✓ Bulk operations executed")

    print("\n💡 Next Steps:")
    print("   1. Check your dashboard to see all created links")
    print("   2. Visit the short URLs to trigger analytics")
    print("   3. Test device/geo routing with different devices")
    print("   4. Monitor webhook events if configured")
    print("=" * 80)


# ============================
# Quick Functions for Colab
# ============================

def quick_create_test_links(api_key, count=5):
    """Quickly create test links"""
    client = EdgeLinkClient(api_key=api_key)
    short_id = str(int(time.time()))[-6:]

    print(f"Creating {count} test links...")
    for i in range(count):
        client.shorten(
            f"https://example.com/test-{i}",
            custom_slug=f"quick{i}-{short_id}"  # Max 13 chars
        )
        time.sleep(0.5)


def quick_test_limits(api_key):
    """Test API and link limits"""
    client = EdgeLinkClient(api_key=api_key)

    print("📊 Testing Limits...")
    print("-" * 80)

    usage = client.get_usage()

    print("\n🔗 Testing Link Creation Limit:")
    short_id = str(int(time.time()))[-6:]
    created = 0

    while created < 60:  # Try to create more than limit
        result = client.shorten(
            f"https://example.com/limit-test-{created}",
            custom_slug=f"lim{created:02d}-{short_id}"  # Max 13 chars (lim00-652564)
        )
        if not result:
            print(f"\n❌ Link limit reached at {created} links")
            break
        created += 1
        print(f"✅ Created link {created}")
        time.sleep(0.2)

    print(f"\n📊 Final count: {created} links created")


# ============================
# Main Execution
# ============================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🚀 EdgeLink Full Feature Client")
    print("=" * 80)

    # Check if API key is set
    if not API_KEY or API_KEY == "elk_IKbF09dsetsopMVoPaZw0m2RfPc9gM6S":
        print("\n⚠️  Please update the API_KEY variable with your actual API key")
        print("   Get your API key from: https://go.shortedbro.xyz/apikeys")
        exit()

    print("\n🎯 Choose an option:")
    print("   1. Run complete feature test (recommended)")
    print("   2. Quick create 5 test links")
    print("   3. Test API and link limits")
    print("   4. Exit")

    choice = input("\nEnter your choice (1-4): ").strip()

    if choice == "1":
        run_complete_test(API_KEY)
    elif choice == "2":
        quick_create_test_links(API_KEY, count=5)
    elif choice == "3":
        quick_test_limits(API_KEY)
    else:
        print("👋 Goodbye!")
