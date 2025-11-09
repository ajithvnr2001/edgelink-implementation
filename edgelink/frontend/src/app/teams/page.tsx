'use client';

/**
 * Teams Dashboard Page - Week 7
 *
 * Features:
 * - List all user's teams
 * - Create new team (Pro only)
 * - Team member count display
 * - Role indicators
 * - Navigation to team details
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Team {
  team_id: string;
  name: string;
  owner_id: string;
  plan: string;
  role: string;
  member_count: number;
  created_at: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    fetchTeams();
    // Get user plan from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserPlan(payload.plan || 'free');
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  async function fetchTeams() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('http://localhost:8787/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setTeams(data.teams || []);
      } else {
        setError(data.error || 'Failed to load teams');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();

    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (userPlan !== 'pro') {
      setError('Creating teams is a Pro feature');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8787/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newTeamName })
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setNewTeamName('');
        fetchTeams(); // Refresh list
      } else {
        setError(data.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'owner':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'admin':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'member':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Teams</h1>
              <p className="text-gray-400 mt-1">Manage your teams and collaborate with others</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Create Team Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your Teams ({teams.length})</h2>
            <p className="text-gray-400 text-sm mt-1">
              {userPlan === 'pro' ? 'Create up to 3 teams' : 'Upgrade to Pro to create teams'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={userPlan !== 'pro'}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              userPlan === 'pro'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            + Create Team
          </button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
            <p className="text-gray-400 mb-6">
              {userPlan === 'pro'
                ? 'Create your first team to start collaborating'
                : 'Upgrade to Pro to create and manage teams'}
            </p>
            {userPlan === 'pro' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Your First Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div
                key={team.team_id}
                onClick={() => router.push(`/teams/${team.team_id}`)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(team.role)}`}>
                    {team.role}
                  </span>
                </div>

                <div className="flex items-center text-gray-400 text-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <span className="text-sm text-gray-500">
                    {team.plan === 'pro' ? '✨ Pro Team' : 'Free Team'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Team</h2>

            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Marketing Team"
                  required
                  disabled={creating}
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-300">
                  You can create up to 3 teams with your Pro plan.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName('');
                    setError('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
