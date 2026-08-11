import { randomUUID } from 'node:crypto';
import { Admin } from './admin.entity';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('Admin', () => {
  const fixedUuid = '11111111-1111-1111-1111-111111111111';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    (randomUUID as jest.Mock).mockReturnValue(fixedUuid);
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create an admin with the given credentials
  it('should create an admin with provided props', () => {
    const admin = Admin.create({
      username: 'john',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    });

    expect(admin).toEqual(
      expect.objectContaining({
        id: fixedUuid,
        username: 'john',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });
});
