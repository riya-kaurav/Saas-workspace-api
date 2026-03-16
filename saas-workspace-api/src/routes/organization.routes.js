'use strict';

/**
 * src/routes/organization.routes.js
 *
 * Route layout:
 *   POST   /organizations                              Create org
 *   GET    /organizations                              List my orgs
 *   GET    /organizations/:orgId                       Get org detail
 *   PATCH  /organizations/:orgId                       Update org (OWNER/ADMIN)
 *   DELETE /organizations/:orgId                       Delete org (OWNER)
 *   GET    /organizations/:orgId/members               List members
 *   PATCH  /organizations/:orgId/members/:userId/role  Update member role (OWNER/ADMIN)
 *   DELETE /organizations/:orgId/members/:userId       Remove member (OWNER/ADMIN)
 *   POST   /organizations/:orgId/invitations           Invite user (OWNER/ADMIN)
 *   POST   /invitations/:token/accept                  Accept invitation
 */

const express = require('express');
const router = express.Router();

const orgController = require('../controllers/organization.controller');
const authenticate = require('../middleware/authenticate');
const { requireOrgMembership, requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createOrgSchema,
  updateOrgSchema,
  inviteUserSchema,
  updateMemberRoleSchema,
  paginationSchema,
} = require('../validators/schemas');

// ── All org routes require authentication ─────────────────────
router.use(authenticate);

// ── Org-level CRUD ────────────────────────────────────────────

/**
 * @openapi
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string, example: "Acme Corp" }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post('/', validate(createOrgSchema), orgController.createOrganization);

/**
 * @openapi
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List organizations the current user belongs to
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of organizations
 */
router.get('/', validate(paginationSchema, 'query'), orgController.listMyOrganizations);

/**
 * @openapi
 * /organizations/{orgId}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Not found
 */
router.get('/:orgId', requireOrgMembership, orgController.getOrganization);

/**
 * @openapi
 * /organizations/{orgId}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization (OWNER or ADMIN)
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:orgId',
  requireOrgMembership,
  requireRole('OWNER', 'ADMIN'),
  validate(updateOrgSchema),
  orgController.updateOrganization
);

/**
 * @openapi
 * /organizations/{orgId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization (OWNER only)
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:orgId',
  requireOrgMembership,
  requireRole('OWNER'),
  orgController.deleteOrganization
);

// ── Member Management ─────────────────────────────────────────

/**
 * @openapi
 * /organizations/{orgId}/members:
 *   get:
 *     tags: [Members]
 *     summary: List organization members
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:orgId/members',
  requireOrgMembership,
  validate(paginationSchema, 'query'),
  orgController.getMembers
);

/**
 * @openapi
 * /organizations/{orgId}/members/{userId}/role:
 *   patch:
 *     tags: [Members]
 *     summary: Update a member's role (OWNER or ADMIN)
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:orgId/members/:userId/role',
  requireOrgMembership,
  requireRole('OWNER', 'ADMIN'),
  validate(updateMemberRoleSchema),
  orgController.updateMemberRole
);

/**
 * @openapi
 * /organizations/{orgId}/members/{userId}:
 *   delete:
 *     tags: [Members]
 *     summary: Remove a member (OWNER or ADMIN)
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:orgId/members/:userId',
  requireOrgMembership,
  requireRole('OWNER', 'ADMIN'),
  orgController.removeMember
);

// ── Invitations ───────────────────────────────────────────────

/**
 * @openapi
 * /organizations/{orgId}/invitations:
 *   post:
 *     tags: [Invitations]
 *     summary: Invite a user to the organization (OWNER or ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               role:  { type: string, enum: [ADMIN, MEMBER], default: MEMBER }
 *     responses:
 *       201:
 *         description: Invitation created
 *       409:
 *         description: Already a member or invitation pending
 */
router.post(
  '/:orgId/invitations',
  requireOrgMembership,
  requireRole('OWNER', 'ADMIN'),
  validate(inviteUserSchema),
  orgController.inviteUser
);

module.exports = router;
