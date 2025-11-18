/**
 * Groups Handler - Link organization for Pro users
 * Provides CRUD operations for link groups and link-group management
 */

import type { Env } from '../types';
import { PlanLimitsService } from '../services/payments/planLimits';

interface LinkGroup {
  group_id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  link_count?: number;
  total_clicks?: number;
}

/**
 * Generate a unique group ID
 */
function generateGroupId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'grp_';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * POST /api/groups - Create a new group
 */
export async function handleCreateGroup(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    // Check if user can create groups
    const canCreate = await PlanLimitsService.canCreateGroup(env, userId, plan);
    if (!canCreate.allowed) {
      return new Response(
        JSON.stringify({
          error: canCreate.reason,
          code: 'GROUP_LIMIT_REACHED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    };

    if (!body.name || body.name.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Group name is required',
          code: 'NAME_REQUIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (body.name.length > 100) {
      return new Response(
        JSON.stringify({
          error: 'Group name must be 100 characters or less',
          code: 'NAME_TOO_LONG'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for duplicate name
    const existing = await env.DB.prepare(`
      SELECT group_id FROM link_groups
      WHERE user_id = ? AND name = ? AND archived_at IS NULL
    `).bind(userId, body.name.trim()).first();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'A group with this name already exists',
          code: 'DUPLICATE_NAME'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const groupId = generateGroupId();
    const color = body.color || '#3B82F6';
    const icon = body.icon || 'folder';

    await env.DB.prepare(`
      INSERT INTO link_groups (group_id, user_id, name, description, color, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      groupId,
      userId,
      body.name.trim(),
      body.description || null,
      color,
      icon
    ).run();

    const group = await env.DB.prepare(`
      SELECT * FROM link_groups WHERE group_id = ?
    `).bind(groupId).first();

    return new Response(
      JSON.stringify({
        message: 'Group created successfully',
        group: {
          ...group,
          link_count: 0,
          total_clicks: 0
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create group',
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
 * GET /api/groups - Get all user's groups
 */
export async function handleGetGroups(
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    // Check if user has access to groups feature
    if (!PlanLimitsService.hasFeatureAccess(plan, 'groups')) {
      return new Response(
        JSON.stringify({
          error: 'Link groups are a Pro feature. Upgrade to Pro to organize your links.',
          code: 'PRO_REQUIRED',
          groups: [],
          ungrouped_count: 0
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get groups with link counts and total clicks
    const groups = await env.DB.prepare(`
      SELECT
        g.*,
        COUNT(l.slug) as link_count,
        COALESCE(SUM(l.click_count), 0) as total_clicks
      FROM link_groups g
      LEFT JOIN links l ON g.group_id = l.group_id
      WHERE g.user_id = ? AND g.archived_at IS NULL
      GROUP BY g.group_id
      ORDER BY g.name ASC
    `).bind(userId).all();

    // Get count of ungrouped links
    const ungroupedResult = await env.DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(click_count), 0) as clicks
      FROM links
      WHERE user_id = ? AND group_id IS NULL
    `).bind(userId).first() as { count: number; clicks: number } | null;

    return new Response(
      JSON.stringify({
        groups: groups.results || [],
        ungrouped_count: ungroupedResult?.count || 0,
        ungrouped_clicks: ungroupedResult?.clicks || 0,
        max_groups: PlanLimitsService.getGroupLimit(plan)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get groups error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch groups',
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
 * GET /api/groups/:groupId - Get single group with links
 */
export async function handleGetGroup(
  env: Env,
  userId: string,
  groupId: string,
  searchParams: URLSearchParams
): Promise<Response> {
  try {
    // Verify ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Get links in group
    const links = await env.DB.prepare(`
      SELECT slug, destination, custom_domain, created_at, updated_at,
             expires_at, click_count, last_clicked_at, group_id,
             CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END as password_protected
      FROM links
      WHERE user_id = ? AND group_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, groupId, limit, offset).all();

    // Get total count
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(click_count), 0) as total_clicks
      FROM links
      WHERE user_id = ? AND group_id = ?
    `).bind(userId, groupId).first() as { count: number; total_clicks: number } | null;

    return new Response(
      JSON.stringify({
        group,
        links: links.results || [],
        total: countResult?.count || 0,
        total_clicks: countResult?.total_clicks || 0,
        page,
        limit,
        total_pages: Math.ceil((countResult?.count || 0) / limit)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch group',
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
 * PUT /api/groups/:groupId - Update group
 */
export async function handleUpdateGroup(
  request: Request,
  env: Env,
  userId: string,
  groupId: string
): Promise<Response> {
  try {
    // Verify ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
    };

    // Validate name if provided
    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Group name cannot be empty',
            code: 'NAME_REQUIRED'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (body.name.length > 100) {
        return new Response(
          JSON.stringify({
            error: 'Group name must be 100 characters or less',
            code: 'NAME_TOO_LONG'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check for duplicate name (excluding current group)
      const existing = await env.DB.prepare(`
        SELECT group_id FROM link_groups
        WHERE user_id = ? AND name = ? AND group_id != ? AND archived_at IS NULL
      `).bind(userId, body.name.trim(), groupId).first();

      if (existing) {
        return new Response(
          JSON.stringify({
            error: 'A group with this name already exists',
            code: 'DUPLICATE_NAME'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description || null);
    }
    if (body.color !== undefined) {
      updates.push('color = ?');
      values.push(body.color);
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?');
      values.push(body.icon);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No updates provided',
          code: 'NO_UPDATES'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    values.push(groupId);
    await env.DB.prepare(`
      UPDATE link_groups SET ${updates.join(', ')} WHERE group_id = ?
    `).bind(...values).run();

    const updatedGroup = await env.DB.prepare(`
      SELECT * FROM link_groups WHERE group_id = ?
    `).bind(groupId).first();

    return new Response(
      JSON.stringify({
        message: 'Group updated successfully',
        group: updatedGroup
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update group',
        code: 'UPDATE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * DELETE /api/groups/:groupId - Delete group (moves links to ungrouped)
 */
export async function handleDeleteGroup(
  env: Env,
  userId: string,
  groupId: string
): Promise<Response> {
  try {
    // Verify ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get count of links that will be moved
    const linkCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM links WHERE group_id = ?
    `).bind(groupId).first() as { count: number } | null;

    // Move links to ungrouped (set group_id to NULL)
    await env.DB.prepare(`
      UPDATE links SET group_id = NULL WHERE group_id = ?
    `).bind(groupId).run();

    // Delete the group
    await env.DB.prepare(`
      DELETE FROM link_groups WHERE group_id = ?
    `).bind(groupId).run();

    return new Response(
      JSON.stringify({
        message: 'Group deleted successfully',
        links_moved: linkCount?.count || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Delete group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete group',
        code: 'DELETE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * POST /api/groups/:groupId/links - Add links to group
 */
export async function handleAddLinksToGroup(
  request: Request,
  env: Env,
  userId: string,
  groupId: string
): Promise<Response> {
  try {
    // Verify group ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as { slugs: string[] };

    if (!body.slugs || !Array.isArray(body.slugs) || body.slugs.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'At least one link slug is required',
          code: 'SLUGS_REQUIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify all links belong to user
    const placeholders = body.slugs.map(() => '?').join(',');
    const linksResult = await env.DB.prepare(`
      SELECT slug FROM links
      WHERE slug IN (${placeholders}) AND user_id = ?
    `).bind(...body.slugs, userId).all();

    const validSlugs = (linksResult.results || []).map((l: { slug: string }) => l.slug);
    const invalidSlugs = body.slugs.filter(s => !validSlugs.includes(s));

    if (invalidSlugs.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Some links not found or not owned by you: ${invalidSlugs.join(', ')}`,
          code: 'INVALID_SLUGS'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update links to be in this group
    await env.DB.prepare(`
      UPDATE links SET group_id = ?
      WHERE slug IN (${placeholders}) AND user_id = ?
    `).bind(groupId, ...body.slugs, userId).run();

    return new Response(
      JSON.stringify({
        message: 'Links added to group successfully',
        added: validSlugs.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Add links to group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to add links to group',
        code: 'ADD_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/links - Remove links from group
 */
export async function handleRemoveLinksFromGroup(
  request: Request,
  env: Env,
  userId: string,
  groupId: string
): Promise<Response> {
  try {
    // Verify group ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as { slugs: string[] };

    if (!body.slugs || !Array.isArray(body.slugs) || body.slugs.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'At least one link slug is required',
          code: 'SLUGS_REQUIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Remove links from group (set to ungrouped)
    const placeholders = body.slugs.map(() => '?').join(',');
    const result = await env.DB.prepare(`
      UPDATE links SET group_id = NULL
      WHERE slug IN (${placeholders}) AND user_id = ? AND group_id = ?
    `).bind(...body.slugs, userId, groupId).run();

    return new Response(
      JSON.stringify({
        message: 'Links removed from group successfully',
        removed: result.meta.changes || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Remove links from group error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to remove links from group',
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
 * PUT /api/links/:slug/group - Move a single link to a group
 */
export async function handleMoveLink(
  request: Request,
  env: Env,
  userId: string,
  slug: string
): Promise<Response> {
  try {
    // Verify link ownership
    const link = await env.DB.prepare(`
      SELECT * FROM links WHERE slug = ? AND user_id = ?
    `).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({
          error: 'Link not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json() as { group_id: string | null };

    // If moving to a group, verify group exists and belongs to user
    if (body.group_id) {
      const group = await env.DB.prepare(`
        SELECT * FROM link_groups
        WHERE group_id = ? AND user_id = ?
      `).bind(body.group_id, userId).first();

      if (!group) {
        return new Response(
          JSON.stringify({
            error: 'Target group not found',
            code: 'GROUP_NOT_FOUND'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Update link's group
    await env.DB.prepare(`
      UPDATE links SET group_id = ? WHERE slug = ?
    `).bind(body.group_id || null, slug).run();

    return new Response(
      JSON.stringify({
        message: body.group_id ? 'Link moved to group' : 'Link moved to ungrouped',
        slug,
        group_id: body.group_id || null
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Move link error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to move link',
        code: 'MOVE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * POST /api/links/bulk-group - Bulk move links to a group
 */
export async function handleBulkMoveLinks(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as {
      slugs: string[];
      group_id: string | null;
    };

    if (!body.slugs || !Array.isArray(body.slugs) || body.slugs.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'At least one link slug is required',
          code: 'SLUGS_REQUIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If moving to a group, verify group exists and belongs to user
    if (body.group_id) {
      const group = await env.DB.prepare(`
        SELECT * FROM link_groups
        WHERE group_id = ? AND user_id = ?
      `).bind(body.group_id, userId).first();

      if (!group) {
        return new Response(
          JSON.stringify({
            error: 'Target group not found',
            code: 'GROUP_NOT_FOUND'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Update all links
    const placeholders = body.slugs.map(() => '?').join(',');
    const result = await env.DB.prepare(`
      UPDATE links SET group_id = ?
      WHERE slug IN (${placeholders}) AND user_id = ?
    `).bind(body.group_id || null, ...body.slugs, userId).run();

    return new Response(
      JSON.stringify({
        message: body.group_id ? 'Links moved to group' : 'Links moved to ungrouped',
        moved: result.meta.changes || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Bulk move links error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to move links',
        code: 'BULK_MOVE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
