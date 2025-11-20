'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout, getAuthHeaders } from '@/lib/api';
import MobileNav from '@/components/MobileNav';
import BottomNav from '@/components/BottomNav';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScheduleDeleteModal, setShowScheduleDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  async function fetchProfile() {
    try {
      const response = await fetch(`${apiUrl}/api/user/profile`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }

  async function handleDeleteAccount() {
    setError('');
    setSuccess('');

    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    if (!deletePassword) {
      setError('Please enter your password to confirm.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/user/delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      if (response.ok) {
        // Clear auth data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        // Show success and redirect
        alert('Your account has been deleted successfully. You will be redirected to the home page.');
        router.push('/');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      setError('An error occurred while deleting your account');
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleDelete() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/user/request-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason: deleteReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Account deletion scheduled for ${new Date(data.deletion_scheduled_for).toLocaleDateString()}. You have a 30-day grace period to cancel.`);
        setShowScheduleDeleteModal(false);
        fetchProfile();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to schedule account deletion');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelDeletion() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/user/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setSuccess('Account deletion has been cancelled.');
        fetchProfile();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel deletion');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    try {
      const response = await fetch(`${apiUrl}/api/user/export`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edgelink-data-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSuccess('Data exported successfully');
      } else {
        setError('Failed to export data');
      }
    } catch (err) {
      setError('An error occurred while exporting data');
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <MobileNav onLogout={handleLogout} />

      {/* Header - Hidden on mobile */}
      <header className="border-b border-gray-700 hidden lg:block">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
              <h1 className="text-xl font-bold text-white">EdgeLink</h1>
            </Link>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
              Create Link
            </Link>
            <Link href="/billing/settings" className="text-gray-300 hover:text-white transition-colors">
              Billing
            </Link>
            <span className="text-gray-400">
              {user.email}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
              {user.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link href="/dashboard" className="text-primary-500 hover:text-primary-400 mb-6 inline-block">
            ← Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Account Info */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Account Information</h2>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{user.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-400">Plan</span>
                <span className="text-primary-400 font-medium uppercase">{user.plan || 'free'}</span>
              </div>
              {profile && (
                <>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-gray-400">Member Since</span>
                    <span className="text-white">{new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                  {profile.stats && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="text-gray-400">Total Links</span>
                        <span className="text-white">{profile.stats.total_links}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="text-gray-400">Teams Owned</span>
                        <span className="text-white">{profile.stats.teams_owned}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Pending Deletion Warning */}
          {profile?.deletion_requested_at && (
            <div className="mb-8 p-6 bg-yellow-500/20 border border-yellow-500 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400">Account Deletion Pending</h2>
              <p className="mb-4 text-gray-300">Your account is scheduled for deletion on {new Date(profile.deletion_requested_at).toLocaleDateString()}.</p>
              <button
                onClick={handleCancelDeletion}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 text-white"
              >
                Cancel Deletion
              </button>
            </div>
          )}

          {/* Export Data */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Export Your Data</h2>
            <p className="mb-4 text-gray-400">Download all your data in JSON format (GDPR compliant). This includes your links, analytics, and account information.</p>
            <button
              onClick={handleExportData}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-medium min-h-[44px]"
            >
              Export Data
            </button>
          </div>

          {/* Danger Zone */}
          <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg">
            <h2 className="text-xl font-semibold mb-6 text-red-400">Danger Zone</h2>

            <div className="mb-8 pb-6 border-b border-red-500/30">
              <h3 className="text-lg font-semibold mb-2 text-white">Schedule Account Deletion</h3>
              <p className="mb-4 text-gray-400">
                Schedule your account for deletion with a 30-day grace period. You can cancel anytime during this period.
              </p>
              <button
                onClick={() => setShowScheduleDeleteModal(true)}
                disabled={loading || profile?.deletion_requested_at}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50 text-white font-medium min-h-[44px]"
              >
                Schedule Deletion
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-white">Delete Account Immediately</h3>
              <p className="mb-4 text-gray-400">
                <strong className="text-red-400">Warning:</strong> This action is immediate and cannot be undone. All your data will be permanently deleted.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 text-white font-medium min-h-[44px]"
              >
                Delete Account Now
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Immediate Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Delete Account</h2>
            <p className="mb-4 text-gray-300">
              This action will <strong>immediately and permanently</strong> delete your account and all associated data, including:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-400 space-y-1">
              <li>All shortened links</li>
              <li>Analytics data</li>
              <li>API keys</li>
              <li>Custom domains</li>
              <li>Teams and memberships</li>
              <li>Webhooks</li>
            </ul>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Type <strong className="text-red-400">DELETE MY ACCOUNT</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 text-white"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Enter your password:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 text-white"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmation !== 'DELETE MY ACCOUNT' || !deletePassword}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 text-white font-medium min-h-[44px]"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Delete Modal */}
      {showScheduleDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Schedule Account Deletion</h2>
            <p className="mb-4 text-gray-300">
              Your account will be scheduled for deletion in <strong>30 days</strong>. You can cancel this request anytime before the deletion date.
            </p>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Reason for leaving (optional):
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-yellow-500 text-white"
                rows={3}
                placeholder="Help us improve..."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleScheduleDelete}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50 text-white font-medium min-h-[44px]"
              >
                {loading ? 'Scheduling...' : 'Schedule Deletion'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleDeleteModal(false);
                  setDeleteReason('');
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer - hidden on mobile */}
      <footer className="hidden lg:block border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 EdgeLink. Built with Cloudflare Workers.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                Privacy Policy
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white text-sm">
                FAQ
              </Link>
              <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
