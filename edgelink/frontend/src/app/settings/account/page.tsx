'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScheduleDeleteModal, setShowScheduleDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      if (response.ok) {
        // Clear auth data
        localStorage.removeItem('authToken');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/request-deletion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/cancel-deletion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

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
        {profile && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-2">
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Name:</strong> {profile.name || 'Not set'}</p>
              <p><strong>Plan:</strong> <span className="text-blue-400 uppercase">{profile.plan}</span></p>
              <p><strong>Member Since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
              {profile.stats && (
                <>
                  <p><strong>Total Links:</strong> {profile.stats.total_links}</p>
                  <p><strong>Teams Owned:</strong> {profile.stats.teams_owned}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Pending Deletion Warning */}
        {profile?.deletion_requested_at && (
          <div className="mb-8 p-6 bg-yellow-500/20 border border-yellow-500 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">⚠️ Account Deletion Pending</h2>
            <p className="mb-4">Your account is scheduled for deletion on {new Date(profile.deletion_requested_at).toLocaleDateString()}.</p>
            <button
              onClick={handleCancelDeletion}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              Cancel Deletion
            </button>
          </div>
        )}

        {/* Export Data */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Export Your Data</h2>
          <p className="mb-4 text-gray-400">Download all your data in JSON format (GDPR compliant).</p>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Export Data
          </button>
        </div>

        {/* Danger Zone */}
        <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Schedule Account Deletion</h3>
            <p className="mb-4 text-gray-400">
              Schedule your account for deletion with a 30-day grace period. You can cancel anytime during this period.
            </p>
            <button
              onClick={() => setShowScheduleDeleteModal(true)}
              disabled={loading || profile?.deletion_requested_at}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50"
            >
              Schedule Deletion
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Delete Account Immediately</h3>
            <p className="mb-4 text-gray-400">
              <strong>Warning:</strong> This action is immediate and cannot be undone. All your data will be permanently deleted.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              Delete Account Now
            </button>
          </div>
        </div>

        {/* Immediate Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
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
                <li>A/B tests</li>
              </ul>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">
                  Type <strong>DELETE MY ACCOUNT</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">
                  Enter your password:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                  placeholder="Password"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || deleteConfirmation !== 'DELETE MY ACCOUNT' || !deletePassword}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
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
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
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
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4 text-yellow-400">Schedule Account Deletion</h2>
              <p className="mb-4 text-gray-300">
                Your account will be scheduled for deletion in <strong>30 days</strong>. You can cancel this request anytime before the deletion date.
              </p>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">
                  Reason for leaving (optional):
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-yellow-500"
                  rows={3}
                  placeholder="Help us improve..."
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleScheduleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50"
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
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
