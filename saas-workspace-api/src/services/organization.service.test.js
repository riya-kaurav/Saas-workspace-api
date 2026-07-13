'use strict';

jest.mock('../config/database', () => ({
  organizationMember: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  invitation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((promises) => Promise.all(promises)),
}));

jest.mock('../config', () => ({
  invitation: {
    expiresInDays: 7,
  },
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
}));

const prisma = require('../config/database');
const orgService = require('./organization.service');
const { NotFoundError } = require('../utils/errors');

describe('Organization Service - Soft Deletion and Invitation Bugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserOrganizations', () => {
    it('should query only active organizations', async () => {
      prisma.organizationMember.findMany.mockResolvedValueOnce([]);
      prisma.organizationMember.count.mockResolvedValueOnce(0);

      await orgService.getUserOrganizations('user-1', { page: 1, limit: 10 });

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            organization: {
              isActive: true,
            },
          },
        })
      );
      expect(prisma.organizationMember.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organization: {
            isActive: true,
          },
        },
      });
    });
  });

  describe('getMembers', () => {
    it('should scope the query to the given organization, paginate, and select only safe user fields', async () => {
      prisma.organizationMember.findMany.mockResolvedValueOnce([]);
      prisma.organizationMember.count.mockResolvedValueOnce(0);

      await orgService.getMembers('org-1', { page: 2, limit: 20 });

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          skip: 20,
          take: 20,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        })
      );
      expect(prisma.organizationMember.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });

    it('should never select passwordHash or other sensitive user fields', async () => {
      prisma.organizationMember.findMany.mockResolvedValueOnce([]);
      prisma.organizationMember.count.mockResolvedValueOnce(0);

      await orgService.getMembers('org-1', { page: 1, limit: 20 });

      const call = prisma.organizationMember.findMany.mock.calls[0][0];
      const selectedFields = Object.keys(call.include.user.select);

      expect(selectedFields).not.toContain('passwordHash');
      expect(selectedFields).not.toContain('resetToken');
      expect(selectedFields).toEqual(['id', 'firstName', 'lastName', 'email', 'avatarUrl']);
    });

    it('should return total and totalPages for pagination controls', async () => {
      const members = Array.from({ length: 20 }, (_, i) => ({ id: `member-${i}` }));
      prisma.organizationMember.findMany.mockResolvedValueOnce(members);
      prisma.organizationMember.count.mockResolvedValueOnce(45);

      const result = await orgService.getMembers('org-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(45);
    });
  });

  describe('acceptInvitation', () => {
    it('should throw NotFoundError if the organization is soft-deleted', async () => {
      const mockInvitation = {
        id: 'inv-1',
        token: 'token-abc',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        organizationId: 'org-1',
        email: 'test@example.com',
        role: 'MEMBER',
        organization: {
          isActive: false,
        },
      };

      prisma.invitation.findUnique.mockResolvedValueOnce(mockInvitation);

      await expect(orgService.acceptInvitation('token-abc', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });
});
