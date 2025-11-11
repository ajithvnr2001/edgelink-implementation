"""
EdgeLink API Client - Python Example
Demonstrates both JWT and API key authentication methods
"""

import requests
import json

# Configuration
BASE_URL = "https://edgelink-production.quoteviral.workers.dev"

class EdgeLinkClient:
    """EdgeLink API client with JWT and API key support"""

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
            print(response.json())
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
            print(response.json())
            return None

    def generate_api_key(self, name="Python Script", expires_in_days=365):
        """Generate a new API key (requires JWT authentication)"""
        if not self.jwt_token:
            print("❌ JWT token required to generate API keys. Login first.")
            return None

        # Temporarily use JWT for this request
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
            print(response.json())
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
            print(response.json())
            return None

    def shorten(self, url, custom_slug=None, **kwargs):
        """Create a short link"""
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
            print(response.json())
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
            print(response.json())
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
            print(response.json())
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
            print(response.json())
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
            print(response.json())
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
            print(response.json())
            return None

    def set_device_routing(self, slug, mobile, desktop, tablet=None):
        """Configure device-based routing (Pro only)"""
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
            print(response.json())
            return None

    def set_geo_routing(self, slug, routes):
        """Configure geographic routing (Pro only)"""
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
            print(response.json())
            return None

    def set_referrer_routing(self, slug, routes):
        """Configure referrer-based routing (Pro only)"""
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
            print(response.json())
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
            print(response.json())
            return None


# ============================
# Example Usage
# ============================

if __name__ == "__main__":
    print("=" * 70)
    print("EdgeLink API Client - Python Example")
    print("=" * 70)
    print()

    # Example 1: Using API Key (recommended for scripts)
    print("\n📌 Example 1: Authentication with API Key")
    print("-" * 70)

    # If you have an existing API key, use it directly
    client = EdgeLinkClient(api_key="elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr")

    # Test the API key
    print("\nTesting API key authentication...")
    client.list_links(page=1, limit=5)

    print("\n" + "=" * 70)

    # Example 2: Using Email/Password (JWT)
    print("\n📌 Example 2: Authentication with Email/Password")
    print("-" * 70)

    # Login with email/password
    # client2 = EdgeLinkClient(email="your@email.com", password="yourpassword")

    # Or signup first
    # client2 = EdgeLinkClient()
    # client2.signup("new@email.com", "securepassword", "free")

    # Then generate an API key for future use
    # client2.generate_api_key("My Python Script", expires_in_days=365)

    print("\n" + "=" * 70)

    # Example 3: Using the client
    print("\n📌 Example 3: Common Operations")
    print("-" * 70)

    # Create a short link
    print("\n1. Creating a short link...")
    link = client.shorten(
        "https://example.com/very-long-url",
        custom_slug="my-link"
    )

    # Get stats
    if link:
        print(f"\n2. Getting stats for {link['slug']}...")
        client.get_stats(link['slug'])

    # List all links
    print("\n3. Listing all links...")
    client.list_links(page=1, limit=10)

    # Configure device routing (Pro only)
    # print("\n4. Configuring device routing...")
    # client.set_device_routing(
    #     "my-link",
    #     mobile="https://m.example.com",
    #     desktop="https://www.example.com"
    # )

    # Configure geo routing (Pro only)
    # print("\n5. Configuring geographic routing...")
    # client.set_geo_routing("my-link", {
    #     "US": "https://example.com/us",
    #     "GB": "https://example.com/uk",
    #     "default": "https://example.com"
    # })

    print("\n" + "=" * 70)
    print("✅ Examples completed!")
    print("=" * 70)
