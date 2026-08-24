import { randomUUID } from 'node:crypto';
import { AdminRefreshToken } from './admin-refresh-token.entity';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('AdminRefreshToken', () => {
  const fixedUuid = '22222222-2222-2222-2222-222222222222';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const adminId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    (randomUUID as jest.Mock).mockReturnValue(fixedUuid);
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create a refresh token for an admin session
  it('should create a refresh token with provided props', () => {
    const expiresAt = new Date('2026-01-22T10:00:00.000Z');

    const token = AdminRefreshToken.create({
      tokenHash: 'hashed-token',
      userAgent: 'Mozilla/5.0',
      expiresAt,
      adminId,
    });

    expect(token).toEqual(
      expect.objectContaining({
        id: fixedUuid,
        tokenHash: 'hashed-token',
        userAgent: 'Mozilla/5.0',
        expiresAt,
        createdAt: fixedNow,
        adminId,
      }),
    );
  });

  // Token should be expired when expiresAt is in the past
  it('should report expired when expiresAt is in the past', () => {
    const token = AdminRefreshToken.create({
      tokenHash: 'hashed-token',
      userAgent: 'Mozilla/5.0',
      expiresAt: new Date('2026-01-14T10:00:00.000Z'),
      adminId,
    });

    expect(token.isExpired).toBe(true);
  });

  // Token should not be expired when expiresAt is in the future
  it('should report not expired when expiresAt is in the future', () => {
    const token = AdminRefreshToken.create({
      tokenHash: 'hashed-token',
      userAgent: 'Mozilla/5.0',
      expiresAt: new Date('2026-01-22T10:00:00.000Z'),
      adminId,
    });

    expect(token.isExpired).toBe(false);
  });
});
