'use strict';

jest.mock('../config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  set: jest.fn(),
}));

jest.mock('../config', () => ({
  bcrypt: { rounds: 10 },
  jwt: {
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const authService = require('./auth.service');

describe('authService email normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
    signAccessToken.mockReturnValue('access-token');
    signRefreshToken.mockReturnValue('refresh-token');
    prisma.refreshToken.create.mockResolvedValue({});
  });

  it('normalizes email before checking and creating a signup user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockImplementationOnce(({ data }) => Promise.resolve({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));

    const result = await authService.signup({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '  ADA@Example.COM ',
      password: 'Password123',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
    });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'ada@example.com' }),
    }));
    expect(result.user.email).toBe('ada@example.com');
  });

  it('normalizes email before login lookup', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      passwordHash: 'hashed-password',
      isActive: true,
    });

    const result = await authService.login({
      email: ' ADA@Example.COM ',
      password: 'Password123',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed-password');
    expect(result.user.email).toBe('ada@example.com');
  });
});
