'use client';

/**
 * EdgeLink Frontend - Custom Domains Management Page
 * Week 3 Implementation
 * Based on PRD v4.1 Week 3: Domain Management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDomains, addDomain, verifyDomain, deleteDomain } from '@/lib/api';

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
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [verificationInfo, setVerificationInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const data = await getDomains() as any;
      setDomains(data.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
      if ((err as any).message?.includes('401')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const result = await addDomain(newDomainName);
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
      const result = await verifyDomain(domainId) as any;
      if (result.verified) {
        setSuccess('Domain verified successfully!');
        setVerificationInfo(null);
        loadDomains();
      } else {
        // More detailed error message
        const errorMsg = result.message || 'Verification failed. Please check DNS records.';
        const dnsInfo = result.dns_check ?
          `\n\nExpected DNS Record:\nType: ${result.dns_check.record_type}\nName: ${result.dns_check.record_name}\nValue: ${result.dns_check.record_value}`
          : '';
        setError(errorMsg + dnsInfo);
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
      await deleteDomain(domainId);
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
        {verificationInfo && (
          <div className="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Domain Verification Required</h3>
            <p className="text-gray-300 mb-4">Add the following DNS record to verify ownership:</p>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-gray-400">Type</div>
                <div className="text-gray-400">Name</div>
                <div className="text-gray-400 col-span-2">Value</div>
              </div>

              <div className="grid grid-cols-4 gap-4 p-3 bg-gray-900 rounded border border-gray-700">
                <div className="text-white font-mono">TXT</div>
                <div className="text-white font-mono">_edgelink-verify</div>
                <div className="text-white font-mono col-span-2 truncate">
                  {verificationInfo.verification?.record?.value}
                </div>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(verificationInfo.verification?.record?.value || '')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              📋 Copy Verification Token
            </button>

            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded">
              <p className="text-blue-200 text-sm">
                <strong>Alternative: CNAME Setup</strong>
                <br />
                Point your domain to: <code className="bg-gray-900 px-2 py-1 rounded">cname.edgelink.io</code>
              </p>
            </div>
          </div>
        )}

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
                  {!domain.verified && domain.verification_token && (
                    <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-semibold text-white mb-3">DNS Verification Required</h4>
                      <p className="text-xs text-gray-400 mb-3">
                        Add this TXT record to your DNS in Cloudflare (or your DNS provider):
                      </p>

                      <div className="space-y-2 mb-3">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-gray-500">Type</div>
                          <div className="text-gray-500">Name</div>
                          <div className="text-gray-500">Value</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-2 bg-gray-800 rounded border border-gray-600">
                          <div className="text-white font-mono text-xs">TXT</div>
                          <div className="text-white font-mono text-xs">_edgelink-verify</div>
                          <div className="text-white font-mono text-xs truncate" title={domain.verification_token}>
                            {domain.verification_token}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(domain.verification_token!)}
                          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-xs"
                        >
                          Copy Token
                        </button>
                        <a
                          href={`https://dash.cloudflare.com/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-700 rounded hover:bg-blue-600/30 transition-colors text-xs"
                        >
                          Open Cloudflare DNS
                        </a>
                      </div>

                      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/50 rounded">
                        <p className="text-xs text-blue-200">
                          After adding the DNS record, click "Verify Now" button above. DNS propagation may take a few minutes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Domain Limits Info */}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Domain Limits:</strong> Free tier: 1 domain | Pro tier: 5 domains
            {domains.length > 0 && ` (${domains.length}/1 used)`}
          </p>
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Add Custom Domain</h3>

            <form onSubmit={handleAddDomain}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="links.yourdomain.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  Enter a subdomain (e.g., links.example.com) or root domain (e.g., example.com)
                </p>
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
