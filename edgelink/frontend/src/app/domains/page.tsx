'use client';

/**
 * EdgeLink Frontend - Custom Domains Management Page
 * Week 3 Implementation
 * Based on PRD v4.1 Week 3: Domain Management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz';

interface Domain {
  domain_id: string;
  domain_name: string;
  verified: boolean;
  verification_token?: string;
  verified_at?: string;
  created_at: string;
}

export default function DomainsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, user } = useAuth();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [verificationInfo, setVerificationInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push('/login');
      return;
    }

    if (user) {
      loadDomains();
    }
  }, [isLoaded, isSignedIn, user, router]);

  const loadDomains = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/domains`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/domains`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain_name: newDomainName })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add domain');
      }

      setVerificationInfo(result);
      setSuccess('Domain added! Please verify ownership.');
      setNewDomainName('');
      loadDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setError('');
    setSuccess('');

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/domains/${domainId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify domain');
      }

      if (result.verified) {
        setSuccess('Domain verified successfully!');
        setVerificationInfo(null);
        loadDomains();
      } else {
        // More detailed error message with debug info
        let errorMsg = result.message || 'Verification failed. Please check DNS records.';

        if (result.dns_check) {
          errorMsg += `\n\nExpected DNS Record:\n`;
          errorMsg += `Type: ${result.dns_check.record_type}\n`;
          errorMsg += `Name: ${result.dns_check.record_name}\n`;
          errorMsg += `Full Query: ${result.dns_check.full_query_name}\n`;
          errorMsg += `Value: ${result.dns_check.record_value}`;
        }

        if (result.debug) {
          errorMsg += `\n\nDebug Information:\n`;
          if (result.debug.error) {
            errorMsg += `Error: ${result.debug.error}\n`;
          }
          if (result.debug.dns_status !== undefined) {
            errorMsg += `DNS Status: ${result.debug.dns_status}\n`;
          }
          if (result.debug.found_records && result.debug.found_records.length > 0) {
            errorMsg += `Found TXT Records: ${result.debug.found_records.join(', ')}\n`;
          } else {
            errorMsg += `Found TXT Records: None\n`;
          }
          errorMsg += `Query URL: ${result.debug.query_url}`;
        }

        setError(errorMsg);
      }
    } catch (err: any) {
      // Parse the error response to show more details
      let errorMessage = 'Failed to verify domain. ';
      try {
        const errorData = JSON.parse(err.message || '{}');
        errorMessage += errorData.message || errorData.error || err.message;
      } catch {
        errorMessage += err.message || 'Please ensure the TXT record is added to your DNS.';
      }
      setError(errorMessage);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete domain');
      }

      setSuccess('Domain deleted successfully!');
      loadDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to delete domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Helper function to parse domain and subdomain
  const parseDomain = (domainName: string) => {
    const parts = domainName.split('.');

    // If it has more than 2 parts, it's likely a subdomain (e.g., go.quoteviral.online)
    // Exception: domains like co.uk, com.au need special handling, but we'll keep it simple
    if (parts.length > 2) {
      const subdomain = parts[0];
      const rootDomain = parts.slice(1).join('.');
      return {
        isSubdomain: true,
        subdomain,
        rootDomain,
        txtRecordName: `_edgelink-verify.${subdomain}`,
        cnameRecordName: subdomain,
        displayType: 'Subdomain'
      };
    } else {
      // Root domain (e.g., quoteviral.online)
      return {
        isSubdomain: false,
        subdomain: null,
        rootDomain: domainName,
        txtRecordName: '_edgelink-verify',
        cnameRecordName: '@',
        displayType: 'Root Domain'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Custom Domains</h1>
            <p className="text-gray-400">Manage your custom domains and verification</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Domain
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {success}
          </div>
        )}

        {/* Verification Instructions */}
        {verificationInfo && (() => {
          const domainInfo = parseDomain(verificationInfo.domain_name);
          return (
            <div className="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-white">Domain Verification Required</h3>
                <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-xs font-medium rounded-full border border-blue-700">
                  {domainInfo.displayType}
                </span>
              </div>
              <p className="text-gray-300 mb-6">
                Add these DNS records in Cloudflare (or your DNS provider) for <strong className="text-white">{verificationInfo.domain_name}</strong>:
              </p>

              {/* Step 1: TXT Record */}
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">1</span>
                  TXT Record (For Verification)
                </h4>
                <div className="space-y-2 mb-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="text-gray-500">Type</div>
                    <div className="text-gray-500">Name</div>
                    <div className="text-gray-500">Value</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                    <div className="text-white font-mono text-sm">TXT</div>
                    <div className="text-green-400 font-mono text-sm">{domainInfo.txtRecordName}</div>
                    <div className="text-white font-mono text-xs truncate" title={verificationInfo.verification?.record?.value}>
                      {verificationInfo.verification?.record?.value}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(verificationInfo.verification?.record?.value || '')}
                    className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    📋 Copy Token
                  </button>
                </div>
              </div>

              {/* Step 2: CNAME Record */}
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">2</span>
                  CNAME Record (For Routing)
                </h4>
                <div className="space-y-2 mb-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="text-gray-500">Type</div>
                    <div className="text-gray-500">Name</div>
                    <div className="text-gray-500">Target</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                    <div className="text-white font-mono text-sm">CNAME</div>
                    <div className="text-green-400 font-mono text-sm">{domainInfo.cnameRecordName}</div>
                    <div className="text-white font-mono text-sm">go.shortedbro.xyz</div>
                  </div>
                </div>
                {!domainInfo.isSubdomain && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200">
                    ⚠️ For root domains, make sure to enable <strong>Cloudflare Proxy (Orange Cloud)</strong> on the CNAME record
                  </div>
                )}
              </div>

              {/* Quick Link to Cloudflare */}
              <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-700 rounded">
                <div className="text-sm text-blue-200">
                  <strong>DNS Provider:</strong> Configure in {domainInfo.isSubdomain ? domainInfo.rootDomain : verificationInfo.domain_name}
                </div>
                <a
                  href="https://dash.cloudflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Open Cloudflare DNS →
                </a>
              </div>

              {/* Important Note */}
              <div className="mt-4 p-3 bg-gray-900/50 border border-gray-600 rounded text-xs text-gray-300">
                💡 <strong>After adding both records:</strong> Wait 1-3 minutes for DNS propagation, then click "Verify Now" on your domain below.
              </div>
            </div>
          );
        })()}

        {/* Domains List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {domains.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold text-white mb-2">No domains yet</h3>
              <p className="text-gray-400 mb-6">Add your first custom domain to get started</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Domain
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {domains.map((domain) => (
                <div key={domain.domain_id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{domain.domain_name}</h3>
                        {domain.verified ? (
                          <span className="px-3 py-1 bg-green-900/50 text-green-300 text-xs font-medium rounded-full border border-green-700">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-xs font-medium rounded-full border border-yellow-700">
                            ⏳ Pending Verification
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        Added on {new Date(domain.created_at).toLocaleDateString()}
                        {domain.verified_at && ` • Verified on ${new Date(domain.verified_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!domain.verified && (
                        <button
                          onClick={() => handleVerifyDomain(domain.domain_id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Verify Now
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDomain(domain.domain_id)}
                        className="px-4 py-2 bg-red-600/20 text-red-300 border border-red-700 rounded hover:bg-red-600/30 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Show verification instructions for unverified domains */}
                  {!domain.verified && domain.verification_token && (() => {
                    const domainInfo = parseDomain(domain.domain_name);
                    return (
                      <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-semibold text-white">DNS Setup Instructions</h4>
                          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700">
                            {domainInfo.displayType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                          Add these 2 DNS records in Cloudflare for <strong className="text-white">{domainInfo.isSubdomain ? domainInfo.rootDomain : domain.domain_name}</strong>:
                        </p>

                        {/* Step 1: TXT Record */}
                        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                          <div className="text-xs font-semibold text-gray-300 mb-2">
                            Step 1: TXT Record (Verification)
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-gray-500">Type</div>
                              <div className="text-gray-500">Name</div>
                              <div className="text-gray-500">Value</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900 rounded border border-gray-600">
                              <div className="text-white font-mono text-xs">TXT</div>
                              <div className="text-green-400 font-mono text-xs">{domainInfo.txtRecordName}</div>
                              <div className="text-white font-mono text-xs truncate" title={domain.verification_token}>
                                {domain.verification_token}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: CNAME Record */}
                        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                          <div className="text-xs font-semibold text-gray-300 mb-2">
                            Step 2: CNAME Record (Routing)
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-gray-500">Type</div>
                              <div className="text-gray-500">Name</div>
                              <div className="text-gray-500">Target</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900 rounded border border-gray-600">
                              <div className="text-white font-mono text-xs">CNAME</div>
                              <div className="text-green-400 font-mono text-xs">{domainInfo.cnameRecordName}</div>
                              <div className="text-white font-mono text-xs">go.shortedbro.xyz</div>
                            </div>
                          </div>
                          {!domainInfo.isSubdomain && (
                            <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200">
                              ⚠️ Enable Cloudflare Proxy (Orange Cloud) for root domains
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => copyToClipboard(domain.verification_token!)}
                            className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-xs font-medium"
                          >
                            📋 Copy Token
                          </button>
                          <a
                            href="https://dash.cloudflare.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-700 rounded hover:bg-blue-600/30 transition-colors text-xs font-medium"
                          >
                            Open Cloudflare DNS →
                          </a>
                        </div>

                        <div className="p-2 bg-blue-900/20 border border-blue-700/50 rounded">
                          <p className="text-xs text-blue-200">
                            💡 After adding both DNS records, wait 1-3 minutes then click <strong>"Verify Now"</strong> above.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Domain Limits Info */}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Domain Limits:</strong> Free tier: 0 domains (Pro-only feature) | Pro tier: 2 custom domains with SSL
            {user?.plan === 'pro' && domains.length > 0 && ` (${domains.length}/2 used)`}
          </p>
          {user?.plan === 'free' && (
            <p className="text-sm text-yellow-300 mt-2">
              ⭐ <strong>Upgrade to Pro ($15/month)</strong> to unlock custom domains with SSL certificates
            </p>
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-2">Add Custom Domain</h3>
            <p className="text-sm text-gray-400 mb-6">
              Connect your own domain to create branded short links
            </p>

            <form onSubmit={handleAddDomain}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="go.yourdomain.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Domain Type Examples */}
              <div className="mb-6 space-y-2">
                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-white">Subdomain (Recommended)</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-4">
                    <code className="text-green-400">go.yourdomain.com</code>, <code className="text-green-400">link.yourdomain.com</code>
                  </p>
                  <p className="text-xs text-gray-500 ml-4 mt-1">
                    ✓ Keep your main website • ✓ Easy setup
                  </p>
                </div>

                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-white">Root Domain</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-4">
                    <code className="text-yellow-400">yourdomain.com</code>
                  </p>
                  <p className="text-xs text-gray-500 ml-4 mt-1">
                    ⚠️ Replaces your website with link shortener
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDomainName('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
