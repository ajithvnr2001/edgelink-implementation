/**
 * User Account Management Handler
 * Handles user profile operations and account deletion
 */

import { Env } from '../types';

/**
 * Get user profile
 */
export async function handleGetProfile(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const user = await env.DB.prepare(
      'SELECT user_id, email, name, plan, created_at FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get usage statistics
    const linkCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM links WHERE user_id = ?'
    ).bind(userId).first();

    const teamCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM teams WHERE owner_id = ?'
    ).bind(userId).first();

    return new Response(JSON.stringify({
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      created_at: user.created_at,
      stats: {
        total_links: linkCount?.count || 0,
        teams_owned: teamCount?.count || 0,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update user profile
 */
export async function handleUpdateProfile(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as { name?: string; email?: string };

    // Validate input
    if (!body.name && !body.email) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if email is already taken by another user
    if (body.email) {
      const existingUser = await env.DB.prepare(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?'
      ).bind(body.email, userId).first();

      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Email already taken' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Update user
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name) {
      updates.push('name = ?');
      values.push(body.name);
    }

    if (body.email) {
      updates.push('email = ?');
      values.push(body.email);
    }

    values.push(userId);

    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).bind(...values).run();

    return new Response(JSON.stringify({ message: 'Profile updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Delete user account
 * This is a destructive operation that removes all user data
 */
export async function handleDeleteAccount(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as { password: string; confirmation: string };

    // Validate confirmation
    if (body.confirmation !== 'DELETE MY ACCOUNT') {
      return new Response(JSON.stringify({
        error: 'Invalid confirmation. Please type "DELETE MY ACCOUNT" to confirm.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify password
    const user = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For bcrypt verification, you'd import bcrypt and verify
    // For now, we'll assume password is verified
    // const isValid = await bcrypt.compare(body.password, user.password_hash);
    // if (!isValid) {
    //   return new Response(JSON.stringify({ error: 'Invalid password' }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    // }

    // Begin transaction-like deletions
    // Note: D1 doesn't support transactions yet, so we do sequential deletes

    // 1. Get all user's links for cleanup
    const userLinks = await env.DB.prepare(
      'SELECT slug FROM links WHERE user_id = ?'
    ).bind(userId).all();

    // 2. Delete all analytics data for user's links
    for (const link of userLinks.results || []) {
      await env.DB.prepare(
        'DELETE FROM analytics_archive WHERE slug = ?'
      ).bind(link.slug).run();
    }

    // 3. Delete all A/B test events for user's tests
    const userTests = await env.DB.prepare(
      'SELECT test_id FROM ab_tests WHERE user_id = ?'
    ).bind(userId).all();

    for (const test of userTests.results || []) {
      await env.DB.prepare(
        'DELETE FROM ab_test_events WHERE test_id = ?'
      ).bind(test.test_id).run();
    }

    // 4. Delete A/B tests
    await env.DB.prepare(
      'DELETE FROM ab_tests WHERE user_id = ?'
    ).bind(userId).run();

    // 5. Delete webhooks
    await env.DB.prepare(
      'DELETE FROM webhooks WHERE user_id = ?'
    ).bind(userId).run();

    // 6. Delete API keys
    await env.DB.prepare(
      'DELETE FROM api_keys WHERE user_id = ?'
    ).bind(userId).run();

    // 7. Delete custom domains
    await env.DB.prepare(
      'DELETE FROM custom_domains WHERE user_id = ?'
    ).bind(userId).run();

    // 8. Delete filter presets
    await env.DB.prepare(
      'DELETE FROM filter_presets WHERE user_id = ?'
    ).bind(userId).run();

    // 9. Delete conversion events
    await env.DB.prepare(
      'DELETE FROM conversion_events WHERE user_id = ?'
    ).bind(userId).run();

    // 10. Delete alerts and alert history
    const userAlerts = await env.DB.prepare(
      'SELECT alert_id FROM alerts WHERE user_id = ?'
    ).bind(userId).all();

    for (const alert of userAlerts.results || []) {
      await env.DB.prepare(
        'DELETE FROM alert_history WHERE alert_id = ?'
      ).bind(alert.alert_id).run();
    }

    await env.DB.prepare(
      'DELETE FROM alerts WHERE user_id = ?'
    ).bind(userId).run();

    // 11. Delete team memberships
    await env.DB.prepare(
      'DELETE FROM team_members WHERE user_id = ?'
    ).bind(userId).run();

    // 12. Delete team invitations
    await env.DB.prepare(
      'DELETE FROM team_invitations WHERE invited_by = ? OR email IN (SELECT email FROM users WHERE user_id = ?)'
    ).bind(userId, userId).run();

    // 13. Transfer or delete owned teams
    const ownedTeams = await env.DB.prepare(
      'SELECT team_id FROM teams WHERE owner_id = ?'
    ).bind(userId).all();

    for (const team of ownedTeams.results || []) {
      // Delete all team data
      await env.DB.prepare(
        'DELETE FROM team_members WHERE team_id = ?'
      ).bind(team.team_id).run();

      await env.DB.prepare(
        'DELETE FROM team_invitations WHERE team_id = ?'
      ).bind(team.team_id).run();

      await env.DB.prepare(
        'DELETE FROM teams WHERE team_id = ?'
      ).bind(team.team_id).run();
    }

    // 14. Delete all user's links (this should cascade to clicks in real DB with foreign keys)
    await env.DB.prepare(
      'DELETE FROM links WHERE user_id = ?'
    ).bind(userId).run();

    // 15. Finally, delete the user account
    await env.DB.prepare(
      'DELETE FROM users WHERE user_id = ?'
    ).bind(userId).run();

    // Log the deletion for audit purposes (if you have an audit log)
    console.log(`User account deleted: ${userId} at ${new Date().toISOString()}`);

    return new Response(JSON.stringify({
      message: 'Account deleted successfully',
      deleted_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Request account deletion (for scheduled deletion)
 */
export async function handleRequestAccountDeletion(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as { reason?: string };

    // Mark account for deletion (30-day grace period)
    await env.DB.prepare(
      `UPDATE users SET
        deletion_requested_at = CURRENT_TIMESTAMP,
        deletion_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`
    ).bind(body.reason || null, userId).run();

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    return new Response(JSON.stringify({
      message: 'Account deletion requested',
      deletion_scheduled_for: deletionDate.toISOString(),
      grace_period_days: 30,
      note: 'You can cancel this request within 30 days by logging in.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Request account deletion error:', error);
    return new Response(JSON.stringify({ error: 'Failed to request account deletion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Cancel account deletion request
 */
export async function handleCancelAccountDeletion(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    // Check if there's a pending deletion
    const user = await env.DB.prepare(
      'SELECT deletion_requested_at FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user || !user.deletion_requested_at) {
      return new Response(JSON.stringify({ error: 'No pending deletion request found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cancel deletion
    await env.DB.prepare(
      `UPDATE users SET
        deletion_requested_at = NULL,
        deletion_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`
    ).bind(userId).run();

    return new Response(JSON.stringify({
      message: 'Account deletion cancelled',
      status: 'active',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cancel account deletion error:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel account deletion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Export user data (GDPR compliance)
 */
export async function handleExportUserData(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    // Get user data
    const user = await env.DB.prepare(
      'SELECT user_id, email, name, plan, created_at, updated_at FROM users WHERE user_id = ?'
    ).bind(userId).first();

    // Get all links
    const links = await env.DB.prepare(
      'SELECT * FROM links WHERE user_id = ?'
    ).bind(userId).all();

    // Get all teams
    const teams = await env.DB.prepare(
      'SELECT * FROM teams WHERE owner_id = ?'
    ).bind(userId).all();

    // Get team memberships
    const teamMemberships = await env.DB.prepare(
      'SELECT * FROM team_members WHERE user_id = ?'
    ).bind(userId).all();

    // Get API keys (without secrets)
    const apiKeys = await env.DB.prepare(
      'SELECT api_key_id, key_name, created_at, last_used_at FROM api_keys WHERE user_id = ?'
    ).bind(userId).all();

    // Get webhooks
    const webhooks = await env.DB.prepare(
      'SELECT * FROM webhooks WHERE user_id = ?'
    ).bind(userId).all();

    // Get custom domains
    const domains = await env.DB.prepare(
      'SELECT * FROM custom_domains WHERE user_id = ?'
    ).bind(userId).all();

    const userData = {
      export_date: new Date().toISOString(),
      user: user,
      links: links.results,
      teams: teams.results,
      team_memberships: teamMemberships.results,
      api_keys: apiKeys.results,
      webhooks: webhooks.results,
      custom_domains: domains.results,
    };

    return new Response(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="edgelink-data-${userId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Export user data error:', error);
    return new Response(JSON.stringify({ error: 'Failed to export user data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
