"""
EdgeLink API Client - Complete Python Implementation
Supports all API operations including bulk links, groups, and analytics
"""

import requests
import json
import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any

# Configuration
BASE_URL = "https://go.shortedbro.xyz"
API_KEY = "elk_4qnSlEEu8B4fLtEXtCpgpHrssvt2jVhb"  # Replace with your API key


class EdgeLinkClient:
    """Complete EdgeLink API client with all features"""

    def __init__(self, api_key: str = None, email: str = None, password: str = None):
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

        if email and password and not api_key:
            self.login()

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        token = self.api_key or self.jwt_token
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop('headers', self._get_headers())

        response = requests.request(method, url, headers=headers, **kwargs)
        return response

    # ==========================================
    # Authentication
    # ==========================================

    def login(self, email: str = None, password: str = None) -> Optional[Dict]:
        """Login with email/password to get JWT token"""
        email = email or self.email
        password = password or self.password

        response = self._request('POST', '/auth/login',
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"})

        if response.status_code == 200:
            data = response.json()
            self.jwt_token = data["token"]
            self.email = email
            print(f"✅ Logged in as {data['user']['email']} (Plan: {data['user']['plan']})")
            return data
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(response.json())
            return None

    def signup(self, email: str, password: str, plan: str = "free") -> Optional[Dict]:
        """Create new account"""
        response = self._request('POST', '/auth/signup',
            json={"email": email, "password": password, "plan": plan},
            headers={"Content-Type": "application/json"})

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

    def get_profile(self) -> Optional[Dict]:
        """Get current user profile"""
        response = self._request('GET', '/api/user/profile')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Profile: {data['email']} (Plan: {data['plan']})")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    # ==========================================
    # API Key Management
    # ==========================================

    def generate_api_key(self, name: str = "Python Script", expires_in_days: int = 365) -> Optional[Dict]:
        """Generate a new API key (requires JWT authentication)"""
        if not self.jwt_token:
            print("❌ JWT token required. Login first.")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.jwt_token}"
        }

        response = self._request('POST', '/api/keys',
            json={"name": name, "expires_in_days": expires_in_days},
            headers=headers)

        if response.status_code == 201:
            data = response.json()
            print(f"✅ API Key Generated: {data['api_key']}")
            print(f"⚠️  SAVE THIS KEY NOW - YOU WON'T SEE IT AGAIN!")
            return data
        else:
            print(f"❌ Failed: {response.status_code} - {response.json()}")
            return None

    def list_api_keys(self) -> Optional[Dict]:
        """List all API keys"""
        response = self._request('GET', '/api/keys')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total']} API key(s)")
            for key in data['keys']:
                print(f"  🔑 {key['name']} ({key['key_prefix']})")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        response = self._request('DELETE', f'/api/keys/{key_id}')
        if response.status_code == 200:
            print(f"✅ API key revoked")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False

    # ==========================================
    # Link Operations
    # ==========================================

    def shorten(self, url: str, custom_slug: str = None, group_id: str = None, **kwargs) -> Optional[Dict]:
        """Create a short link"""
        payload = {"url": url}
        if custom_slug:
            payload["custom_slug"] = custom_slug
        if group_id:
            payload["group_id"] = group_id
        payload.update(kwargs)

        response = self._request('POST', '/api/shorten', json=payload)

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Created: {data['short_url']}")
            return data
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def list_links(self, page: int = 1, limit: int = 50, search: str = None) -> Optional[Dict]:
        """List all links"""
        params = f"?page={page}&limit={limit}"
        if search:
            params += f"&search={search}"

        response = self._request('GET', f'/api/links{params}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['total']} links (Page {page}/{data['totalPages']})")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def get_link(self, slug: str) -> Optional[Dict]:
        """Get a single link details"""
        response = self._request('GET', f'/api/links/{slug}')
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def update_link(self, slug: str, destination: str = None, new_slug: str = None) -> Optional[Dict]:
        """Update link destination or slug"""
        payload = {}
        if destination:
            payload["destination"] = destination
        if new_slug:
            payload["slug"] = new_slug

        response = self._request('PUT', f'/api/links/{slug}', json=payload)

        if response.status_code == 200:
            print(f"✅ Link updated")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def delete_link(self, slug: str) -> bool:
        """Delete a link"""
        response = self._request('DELETE', f'/api/links/{slug}')
        if response.status_code == 200:
            print(f"✅ Link deleted: {slug}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False

    def move_link_to_group(self, slug: str, group_id: str = None) -> Optional[Dict]:
        """Move a link to a group (or ungrouped if group_id is None)"""
        response = self._request('PUT', f'/api/links/{slug}/group',
            json={"group_id": group_id})

        if response.status_code == 200:
            print(f"✅ Link moved to {'ungrouped' if not group_id else f'group {group_id}'}")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    # ==========================================
    # Bulk Operations
    # ==========================================

    def bulk_create_links(self, links: List[Dict]) -> List[Dict]:
        """
        Create multiple links at once

        Args:
            links: List of dicts with keys: url, custom_slug (optional), group_id (optional)

        Returns:
            List of created link results
        """
        results = []
        total = len(links)
        successful = 0
        failed = 0

        print(f"📦 Creating {total} links...")

        for i, link_data in enumerate(links, 1):
            url = link_data.get('url')
            custom_slug = link_data.get('custom_slug')
            group_id = link_data.get('group_id')

            # Extract additional parameters
            kwargs = {k: v for k, v in link_data.items()
                     if k not in ['url', 'custom_slug', 'group_id']}

            result = self.shorten(url, custom_slug, group_id, **kwargs)

            if result:
                successful += 1
                results.append({
                    'success': True,
                    'slug': result['slug'],
                    'short_url': result['short_url'],
                    'destination': url
                })
            else:
                failed += 1
                results.append({
                    'success': False,
                    'destination': url,
                    'error': 'Failed to create'
                })

            # Progress indicator
            if i % 10 == 0 or i == total:
                print(f"  Progress: {i}/{total}")

        print(f"\n✅ Bulk create complete: {successful} successful, {failed} failed")
        return results

    def bulk_import_csv(self, csv_data: str) -> Optional[Dict]:
        """
        Import links from CSV data
        CSV should have columns: destination, custom_slug, group_id, group_name, etc.
        """
        response = self._request('POST', '/api/import/links',
            headers={
                "Content-Type": "text/csv",
                "Authorization": f"Bearer {self.api_key or self.jwt_token}"
            },
            data=csv_data)

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Import complete: {data['successful']}/{data['total']} successful")
            if data['errors']:
                print(f"⚠️  {len(data['errors'])} errors:")
                for err in data['errors'][:5]:
                    print(f"   Row {err['row']}: {err['error']}")
            return data
        else:
            print(f"❌ Import failed: {response.status_code}")
            print(response.json())
            return None

    def bulk_import_from_list(self, links: List[Dict]) -> Optional[Dict]:
        """
        Import links from a list of dicts by converting to CSV

        Args:
            links: List of dicts with keys like destination, custom_slug, group_name
        """
        if not links:
            print("❌ No links provided")
            return None

        # Convert to CSV
        output = io.StringIO()
        fieldnames = list(links[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(links)

        csv_data = output.getvalue()
        return self.bulk_import_csv(csv_data)

    def export_links(self, format: str = 'json') -> Optional[Any]:
        """Export all links as JSON or CSV"""
        response = self._request('GET', f'/api/export/links?format={format}')

        if response.status_code == 200:
            if format == 'json':
                data = response.json()
                print(f"✅ Exported {data['total_links']} links")
                return data
            else:
                print(f"✅ Exported links as CSV")
                return response.text
        else:
            print(f"❌ Export failed: {response.status_code}")
            print(response.json())
            return None

    def bulk_move_to_group(self, slugs: List[str], group_id: str = None) -> Optional[Dict]:
        """Move multiple links to a group"""
        response = self._request('POST', '/api/links/bulk-group',
            json={"slugs": slugs, "group_id": group_id})

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Moved {data['moved']} links")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    # ==========================================
    # Group Operations
    # ==========================================

    def list_groups(self) -> Optional[Dict]:
        """List all groups"""
        response = self._request('GET', '/api/groups')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['groups'])} groups ({data['ungrouped_count']} ungrouped links)")
            for group in data['groups']:
                print(f"  📁 {group['name']} ({group.get('link_count', 0)} links)")
            return data
        else:
            error_data = response.json()
            if error_data.get('code') == 'PRO_REQUIRED':
                print("❌ Groups are a Pro feature. Upgrade to use groups.")
            else:
                print(f"❌ Error: {response.status_code}")
            return None

    def create_group(self, name: str, description: str = None, color: str = "#3B82F6") -> Optional[Dict]:
        """Create a new group"""
        payload = {"name": name, "color": color}
        if description:
            payload["description"] = description

        response = self._request('POST', '/api/groups', json=payload)

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Group created: {data['group']['name']} ({data['group']['group_id']})")
            return data
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def get_group(self, group_id: str, page: int = 1, limit: int = 50) -> Optional[Dict]:
        """Get group details with its links"""
        response = self._request('GET', f'/api/groups/{group_id}?page={page}&limit={limit}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Group: {data['group']['name']} ({data['total']} links)")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def update_group(self, group_id: str, name: str = None, description: str = None, color: str = None) -> Optional[Dict]:
        """Update group details"""
        payload = {}
        if name:
            payload["name"] = name
        if description is not None:
            payload["description"] = description
        if color:
            payload["color"] = color

        response = self._request('PUT', f'/api/groups/{group_id}', json=payload)

        if response.status_code == 200:
            print(f"✅ Group updated")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def delete_group(self, group_id: str) -> bool:
        """Delete a group (links become ungrouped)"""
        response = self._request('DELETE', f'/api/groups/{group_id}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Group deleted ({data['links_moved']} links moved to ungrouped)")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False

    def add_links_to_group(self, group_id: str, slugs: List[str]) -> Optional[Dict]:
        """Add multiple links to a group"""
        response = self._request('POST', f'/api/groups/{group_id}/links',
            json={"slugs": slugs})

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Added {data['added']} links to group")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def remove_links_from_group(self, group_id: str, slugs: List[str]) -> Optional[Dict]:
        """Remove links from a group"""
        response = self._request('DELETE', f'/api/groups/{group_id}/links',
            json={"slugs": slugs})

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Removed {data['removed']} links from group")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    # ==========================================
    # Analytics
    # ==========================================

    def get_stats(self, slug: str) -> Optional[Dict]:
        """Get basic stats for a link"""
        response = self._request('GET', f'/api/stats/{slug}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Stats for {slug}: {data['total_clicks']} clicks")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def get_analytics(self, slug: str, time_range: str = "7d") -> Optional[Dict]:
        """Get detailed analytics for a link"""
        response = self._request('GET', f'/api/analytics/{slug}?range={time_range}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics for {slug} ({time_range}): {data.get('total_clicks', 0)} clicks")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def get_group_analytics(self, group_id: str, time_range: str = "7d") -> Optional[Dict]:
        """Get analytics for a group"""
        response = self._request('GET', f'/api/groups/{group_id}/analytics?range={time_range}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Group analytics ({time_range}): {data['total_clicks']} clicks")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def get_overall_analytics(self, time_range: str = "7d") -> Optional[Dict]:
        """Get overall analytics for all links"""
        response = self._request('GET', f'/api/analytics/overview?range={time_range}')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Overall analytics ({time_range}): {data['total_clicks']} clicks across {data['total_links']} links")
            return data
        else:
            error_data = response.json()
            if error_data.get('code') == 'PRO_REQUIRED':
                print("❌ Overall analytics is a Pro feature.")
            else:
                print(f"❌ Error: {response.status_code}")
            return None

    def export_analytics(self, slug: str, format: str = 'json', time_range: str = "30d") -> Optional[Any]:
        """Export analytics data"""
        response = self._request('GET',
            f'/api/export/analytics/{slug}?format={format}&range={time_range}')

        if response.status_code == 200:
            if format == 'json':
                return response.json()
            return response.text
        else:
            print(f"❌ Export failed: {response.status_code}")
            return None

    # ==========================================
    # Routing Configuration
    # ==========================================

    def get_routing(self, slug: str) -> Optional[Dict]:
        """Get all routing configuration for a link"""
        response = self._request('GET', f'/api/links/{slug}/routing')

        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def set_device_routing(self, slug: str, mobile: str, desktop: str, tablet: str = None) -> Optional[Dict]:
        """Configure device-based routing (Pro only)"""
        payload = {"mobile": mobile, "desktop": desktop}
        if tablet:
            payload["tablet"] = tablet

        response = self._request('POST', f'/api/links/{slug}/routing/device', json=payload)

        if response.status_code == 200:
            print(f"✅ Device routing configured")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def set_geo_routing(self, slug: str, routes: Dict[str, str]) -> Optional[Dict]:
        """Configure geographic routing (Pro only)"""
        response = self._request('POST', f'/api/links/{slug}/routing/geo',
            json={"routes": routes})

        if response.status_code == 200:
            print(f"✅ Geographic routing configured")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def set_referrer_routing(self, slug: str, routes: Dict[str, str]) -> Optional[Dict]:
        """Configure referrer-based routing (Pro only)"""
        response = self._request('POST', f'/api/links/{slug}/routing/referrer',
            json={"routes": routes})

        if response.status_code == 200:
            print(f"✅ Referrer routing configured")
            return response.json()
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def delete_routing(self, slug: str, routing_type: str = None) -> bool:
        """Delete routing configuration"""
        params = f"?type={routing_type}" if routing_type else ""
        response = self._request('DELETE', f'/api/links/{slug}/routing{params}')

        if response.status_code == 200:
            print(f"✅ Routing deleted")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False

    # ==========================================
    # QR Code
    # ==========================================

    def generate_qr(self, slug: str, format: str = 'svg') -> Optional[bytes]:
        """Generate QR code for a link (Pro only)"""
        response = self._request('GET', f'/api/links/{slug}/qr?format={format}')

        if response.status_code == 200:
            print(f"✅ QR code generated")
            return response.content
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    # ==========================================
    # Custom Domains
    # ==========================================

    def list_domains(self) -> Optional[Dict]:
        """List all custom domains"""
        response = self._request('GET', '/api/domains')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['domains'])} domains")
            for domain in data['domains']:
                status = "✓ Verified" if domain['verified'] else "⏳ Pending"
                print(f"  🌐 {domain['domain_name']} ({status})")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def add_domain(self, domain_name: str) -> Optional[Dict]:
        """Add a custom domain"""
        response = self._request('POST', '/api/domains',
            json={"domain_name": domain_name})

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Domain added: {domain_name}")
            print(f"   Add TXT record: _edgelink-verify = {data['verification']['record']['value']}")
            return data
        else:
            print(f"❌ Error: {response.status_code} - {response.json()}")
            return None

    def verify_domain(self, domain_id: str) -> Optional[Dict]:
        """Verify domain ownership"""
        response = self._request('POST', f'/api/domains/{domain_id}/verify')

        if response.status_code == 200:
            print(f"✅ Domain verified!")
            return response.json()
        else:
            print(f"❌ Verification failed: {response.json()}")
            return None

    def delete_domain(self, domain_id: str) -> bool:
        """Delete a custom domain"""
        response = self._request('DELETE', f'/api/domains/{domain_id}')

        if response.status_code == 200:
            print(f"✅ Domain deleted")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False

    # ==========================================
    # Webhooks
    # ==========================================

    def list_webhooks(self) -> Optional[Dict]:
        """List all webhooks"""
        response = self._request('GET', '/api/webhooks')

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data['webhooks'])} webhooks")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def create_webhook(self, url: str, events: List[str], secret: str = None) -> Optional[Dict]:
        """Create a webhook"""
        payload = {"url": url, "events": events}
        if secret:
            payload["secret"] = secret

        response = self._request('POST', '/api/webhooks', json=payload)

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Webhook created: {data['webhook']['webhook_id']}")
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            return None

    def delete_webhook(self, webhook_id: str) -> bool:
        """Delete a webhook"""
        response = self._request('DELETE', f'/api/webhooks/{webhook_id}')

        if response.status_code == 200:
            print(f"✅ Webhook deleted")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False


# ==========================================
# Demo Functions
# ==========================================

def demo_basic_operations(client: EdgeLinkClient):
    """Demonstrate basic link operations"""
    print("\n" + "=" * 70)
    print("DEMO: Basic Link Operations")
    print("=" * 70)

    # Create a link
    link = client.shorten("https://example.com/test-page")
    if link:
        slug = link['slug']

        # Get stats
        client.get_stats(slug)

        # Update destination
        client.update_link(slug, destination="https://example.com/updated")

        # Delete link
        # client.delete_link(slug)

def demo_bulk_operations(client: EdgeLinkClient):
    """Demonstrate bulk link creation"""
    print("\n" + "=" * 70)
    print("DEMO: Bulk Link Operations")
    print("=" * 70)

    # Method 1: Using bulk_create_links
    links_to_create = [
        {"url": "https://example.com/page1"},
        {"url": "https://example.com/page2", "custom_slug": f"custom-{int(datetime.now().timestamp())}"},
        {"url": "https://example.com/page3"},
    ]

    results = client.bulk_create_links(links_to_create)

    # Method 2: Using CSV import (Pro feature)
    csv_data = """destination,custom_slug,group_name
https://example.com/import1,,Marketing
https://example.com/import2,,Marketing
https://example.com/import3,,Sales
"""
    # Uncomment to test CSV import (Pro only):
    # client.bulk_import_csv(csv_data)

def demo_group_operations(client: EdgeLinkClient):
    """Demonstrate group operations (Pro only)"""
    print("\n" + "=" * 70)
    print("DEMO: Group Operations (Pro Only)")
    print("=" * 70)

    # List groups
    groups = client.list_groups()
    if not groups:
        return

    # Create groups
    marketing = client.create_group("Marketing Campaign", "Q4 2024 campaign links", "#10B981")
    sales = client.create_group("Sales Team", "Sales outreach links", "#3B82F6")

    if marketing and sales:
        marketing_id = marketing['group']['group_id']
        sales_id = sales['group']['group_id']

        # Create links in groups
        link1 = client.shorten("https://example.com/campaign1", group_id=marketing_id)
        link2 = client.shorten("https://example.com/campaign2", group_id=marketing_id)
        link3 = client.shorten("https://example.com/sales1", group_id=sales_id)

        # Get group details
        client.get_group(marketing_id)

        # Get group analytics
        client.get_group_analytics(marketing_id)

        # Move links between groups
        if link1:
            client.move_link_to_group(link1['slug'], sales_id)

def demo_routing(client: EdgeLinkClient):
    """Demonstrate routing features (Pro only)"""
    print("\n" + "=" * 70)
    print("DEMO: Smart Routing (Pro Only)")
    print("=" * 70)

    # Create a link
    link = client.shorten("https://example.com/default")
    if not link:
        return

    slug = link['slug']

    # Device routing
    client.set_device_routing(slug,
        mobile="https://m.example.com",
        desktop="https://www.example.com",
        tablet="https://tablet.example.com")

    # Geographic routing
    client.set_geo_routing(slug, {
        "US": "https://example.com/us",
        "GB": "https://example.com/uk",
        "IN": "https://example.com/in",
        "default": "https://example.com"
    })

    # Referrer routing
    client.set_referrer_routing(slug, {
        "twitter.com": "https://example.com/from-twitter",
        "linkedin.com": "https://example.com/from-linkedin",
        "default": "https://example.com"
    })

    # View routing config
    client.get_routing(slug)

def demo_analytics(client: EdgeLinkClient):
    """Demonstrate analytics features"""
    print("\n" + "=" * 70)
    print("DEMO: Analytics")
    print("=" * 70)

    # List links first
    links = client.list_links(limit=5)
    if links and links['links']:
        slug = links['links'][0]['slug']

        # Get detailed analytics
        client.get_analytics(slug, "7d")
        client.get_analytics(slug, "30d")

    # Overall analytics (Pro only)
    client.get_overall_analytics("7d")


# ==========================================
# Main Execution
# ==========================================

if __name__ == "__main__":
    print("=" * 70)
    print("EdgeLink Complete API Client")
    print("=" * 70)

    # Initialize client with API key
    client = EdgeLinkClient(api_key=API_KEY)

    # Run demos
    print("\n🚀 Running API Demos...\n")

    # Basic operations
    demo_basic_operations(client)

    # Bulk operations
    demo_bulk_operations(client)

    # List all links
    print("\n" + "=" * 70)
    print("All Your Links")
    print("=" * 70)
    client.list_links(limit=20)

    # Analytics
    demo_analytics(client)

    # Group operations (Pro only)
    demo_group_operations(client)

    # Routing (Pro only)
    # demo_routing(client)

    # API Keys
    print("\n" + "=" * 70)
    print("API Keys")
    print("=" * 70)
    client.list_api_keys()

    # Export links
    print("\n" + "=" * 70)
    print("Export Links")
    print("=" * 70)
    # exported = client.export_links('json')

    print("\n" + "=" * 70)
    print("✅ All demos completed!")
    print("=" * 70)


# ==========================================
# Quick Functions for Testing
# ==========================================

def quick_client():
    """Get a client instance quickly"""
    return EdgeLinkClient(api_key=API_KEY)

def quick_create(url: str, slug: str = None, group: str = None):
    """Quickly create a link"""
    client = quick_client()
    return client.shorten(url, slug, group)

def quick_bulk_create(urls: List[str]):
    """Quickly create multiple links"""
    client = quick_client()
    links = [{"url": url} for url in urls]
    return client.bulk_create_links(links)

def quick_groups():
    """List all groups"""
    return quick_client().list_groups()

def quick_links(limit: int = 20):
    """List all links"""
    return quick_client().list_links(limit=limit)

def quick_analytics(slug: str):
    """Get analytics for a link"""
    return quick_client().get_analytics(slug)


print("\n" + "=" * 70)
print("Quick Functions Available:")
print("=" * 70)
print("""
quick_client()           - Get a client instance
quick_create(url, slug)  - Create a single link
quick_bulk_create(urls)  - Create multiple links
quick_groups()           - List all groups
quick_links(limit=20)    - List all links
quick_analytics(slug)    - Get analytics

Example usage:
  >>> client = quick_client()
  >>> client.create_group("My Group", "Description", "#FF0000")
  >>> quick_bulk_create([
  ...     "https://example.com/1",
  ...     "https://example.com/2",
  ...     "https://example.com/3"
  ... ])
""")
print("=" * 70)
