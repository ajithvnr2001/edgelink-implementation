/**
 * Team Collaboration Handler (Week 6)
 * Team management, member invitations, and role-based access
 */

import type { Env } from '../types';

export interface Team {
  team_id: string;
  name: string;
  owner_id: string;
  plan: string;
  created_at: string;
}

export interface TeamMember {
  member_id: string;
  team_id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

export interface TeamInvitation {
  invitation_id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
}

/**
 * Handle POST /api/teams
 * Create a new team
 */
export async function handleCreateTeam(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    // Check if Pro plan (teams are Pro feature)
    if (plan !== 'pro') {
      return new Response(
        JSON.stringify({
          error: 'Teams feature is only available for Pro users',
          code: 'PLAN_UPGRADE_REQUIRED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as { name: string };

    if (!body.name || body.name.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Team name is required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check team limit (Pro: 3 teams)
    const existingTeams = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM teams WHERE owner_id = ?'
    ).bind(userId).first();

    const teamCount = (existingTeams?.count as number) || 0;
    const limit = plan === 'pro' ? 3 : 0;

    if (teamCount >= limit) {
      return new Response(
        JSON.stringify({
          error: `You have reached your team limit (${limit})`,
          code: 'TEAM_LIMIT_EXCEEDED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate team ID
    const teamId = `team_${generateRandomId()}`;

    // Create team
    await env.DB.prepare(`
      INSERT INTO teams (team_id, name, owner_id, plan, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(teamId, body.name.trim(), userId, plan).run();

    // Add owner as member
    const memberId = `mem_${generateRandomId()}`;
    await env.DB.prepare(`
      INSERT INTO team_members (member_id, team_id, user_id, role, status, joined_at)
      VALUES (?, ?, ?, 'owner', 'active', datetime('now'))
    `).bind(memberId, teamId, userId).run();

    return new Response(
      JSON.stringify({
        team_id: teamId,
        name: body.name.trim(),
        owner_id: userId,
        plan,
        member_count: 1
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create team error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create team',
        code: 'CREATE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/teams
 * Get user's teams
 */
export async function handleGetTeams(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    // Get teams where user is a member
    const result = await env.DB.prepare(`
      SELECT
        t.team_id,
        t.name,
        t.owner_id,
        t.plan,
        t.created_at,
        tm.role,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.team_id AND status = 'active') as member_count
      FROM teams t
      JOIN team_members tm ON t.team_id = tm.team_id
      WHERE tm.user_id = ? AND tm.status = 'active'
      ORDER BY t.created_at DESC
    `).bind(userId).all();

    return new Response(
      JSON.stringify({
        teams: result.results,
        total: result.results.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get teams error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch teams',
        code: 'FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/teams/:teamId
 * Get team details
 */
export async function handleGetTeamDetails(
  env: Env,
  userId: string,
  teamId: string
): Promise<Response> {
  try {
    // Check if user is a member
    const membership = await env.DB.prepare(`
      SELECT role FROM team_members
      WHERE team_id = ? AND user_id = ? AND status = 'active'
    `).bind(teamId, userId).first();

    if (!membership) {
      return new Response(
        JSON.stringify({
          error: 'Team not found or access denied',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get team details
    const team = await env.DB.prepare(`
      SELECT * FROM teams WHERE team_id = ?
    `).bind(teamId).first();

    // Get members
    const members = await env.DB.prepare(`
      SELECT
        member_id,
        team_id,
        user_id,
        (SELECT email FROM users WHERE user_id = team_members.user_id) as email,
        role,
        status,
        joined_at
      FROM team_members
      WHERE team_id = ?
      ORDER BY
        CASE role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
        END,
        joined_at ASC
    `).bind(teamId).all();

    // Get pending invitations
    const invitations = await env.DB.prepare(`
      SELECT * FROM team_invitations
      WHERE team_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).bind(teamId).all();

    return new Response(
      JSON.stringify({
        team,
        members: members.results,
        invitations: invitations.results,
        user_role: membership.role
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get team details error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch team details',
        code: 'FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle POST /api/teams/:teamId/invite
 * Invite member to team
 */
export async function handleInviteMember(
  request: Request,
  env: Env,
  userId: string,
  teamId: string
): Promise<Response> {
  try {
    // Check if user has admin/owner role
    const membership = await env.DB.prepare(`
      SELECT role FROM team_members
      WHERE team_id = ? AND user_id = ? AND status = 'active'
    `).bind(teamId, userId).first();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return new Response(
        JSON.stringify({
          error: 'Permission denied. Only owners and admins can invite members.',
          code: 'PERMISSION_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as { email: string; role?: 'admin' | 'member' };

    if (!body.email) {
      return new Response(
        JSON.stringify({
          error: 'Email is required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const role = body.role || 'member';

    // Check if user already exists in team
    const existingMember = await env.DB.prepare(`
      SELECT user_id FROM team_members tm
      JOIN users u ON tm.user_id = u.user_id
      WHERE tm.team_id = ? AND u.email = ?
    `).bind(teamId, body.email).first();

    if (existingMember) {
      return new Response(
        JSON.stringify({
          error: 'User is already a member of this team',
          code: 'ALREADY_MEMBER'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for pending invitation
    const pendingInvite = await env.DB.prepare(`
      SELECT invitation_id FROM team_invitations
      WHERE team_id = ? AND email = ? AND status = 'pending'
    `).bind(teamId, body.email).first();

    if (pendingInvite) {
      return new Response(
        JSON.stringify({
          error: 'An invitation is already pending for this email',
          code: 'INVITATION_EXISTS'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create invitation
    const invitationId = `inv_${generateRandomId()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await env.DB.prepare(`
      INSERT INTO team_invitations (
        invitation_id, team_id, email, role, invited_by, expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      invitationId,
      teamId,
      body.email,
      role,
      userId,
      expiresAt.toISOString()
    ).run();

    // TODO: Send invitation email

    return new Response(
      JSON.stringify({
        invitation_id: invitationId,
        email: body.email,
        role,
        expires_at: expiresAt.toISOString(),
        message: 'Invitation sent successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Invite member error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send invitation',
        code: 'INVITE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle POST /api/teams/invitations/:invitationId/accept
 * Accept team invitation
 */
export async function handleAcceptInvitation(
  env: Env,
  userId: string,
  invitationId: string
): Promise<Response> {
  try {
    // Get user email
    const user = await env.DB.prepare(
      'SELECT email FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get invitation
    const invitation = await env.DB.prepare(`
      SELECT * FROM team_invitations
      WHERE invitation_id = ? AND email = ? AND status = 'pending'
    `).bind(invitationId, user.email).first() as TeamInvitation | null;

    if (!invitation) {
      return new Response(
        JSON.stringify({
          error: 'Invitation not found or already processed',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await env.DB.prepare(`
        UPDATE team_invitations SET status = 'expired' WHERE invitation_id = ?
      `).bind(invitationId).run();

      return new Response(
        JSON.stringify({
          error: 'Invitation has expired',
          code: 'INVITATION_EXPIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add user to team
    const memberId = `mem_${generateRandomId()}`;
    await env.DB.prepare(`
      INSERT INTO team_members (member_id, team_id, user_id, role, status, joined_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'))
    `).bind(memberId, invitation.team_id, userId, invitation.role).run();

    // Update invitation status
    await env.DB.prepare(`
      UPDATE team_invitations SET status = 'accepted' WHERE invitation_id = ?
    `).bind(invitationId).run();

    return new Response(
      JSON.stringify({
        message: 'Invitation accepted successfully',
        team_id: invitation.team_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Accept invitation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to accept invitation',
        code: 'ACCEPT_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle DELETE /api/teams/:teamId/members/:memberId
 * Remove team member
 */
export async function handleRemoveMember(
  env: Env,
  userId: string,
  teamId: string,
  memberId: string
): Promise<Response> {
  try {
    // Check if user has admin/owner role
    const requesterRole = await env.DB.prepare(`
      SELECT role FROM team_members
      WHERE team_id = ? AND user_id = ? AND status = 'active'
    `).bind(teamId, userId).first();

    if (!requesterRole || (requesterRole.role !== 'owner' && requesterRole.role !== 'admin')) {
      return new Response(
        JSON.stringify({
          error: 'Permission denied. Only owners and admins can remove members.',
          code: 'PERMISSION_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get member details
    const member = await env.DB.prepare(`
      SELECT role, user_id FROM team_members WHERE member_id = ? AND team_id = ?
    `).bind(memberId, teamId).first();

    if (!member) {
      return new Response(
        JSON.stringify({
          error: 'Member not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      return new Response(
        JSON.stringify({
          error: 'Cannot remove team owner',
          code: 'CANNOT_REMOVE_OWNER'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Admin cannot remove another admin (only owner can)
    if (requesterRole.role === 'admin' && member.role === 'admin') {
      return new Response(
        JSON.stringify({
          error: 'Only the owner can remove admins',
          code: 'PERMISSION_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Remove member
    await env.DB.prepare(`
      DELETE FROM team_members WHERE member_id = ? AND team_id = ?
    `).bind(memberId, teamId).run();

    return new Response(
      JSON.stringify({
        message: 'Member removed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Remove member error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to remove member',
        code: 'REMOVE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Generate random ID
 */
function generateRandomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < 16; i++) {
    id += chars[randomValues[i] % chars.length];
  }

  return id;
}
