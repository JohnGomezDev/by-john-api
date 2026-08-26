import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { Admin } from '../../../../admin/domain/entities/admin.entity';
import { ADMIN_REPOSITORY } from '../../../../admin/domain/repositories/admin.repository.interface';
import { HASHER } from '../../../../../common/security/hasher.interface';
import { AdminRefreshToken } from '../../../domain/entities/admin-refresh-token.entity';
import { ADMIN_REFRESH_TOKEN_REPOSITORY } from '../../../domain/repositories/admin-refresh-token.repository.interface';
import { AUTH_MESSAGES } from '../../constants/auth-messages.constants';
import { RefreshTokenUseCase } from './refresh-token.use-case';

jest.mock('node:crypto', () => {
  const actual: Record<string, unknown> = jest.requireActual('node:crypto');
  return {
    ...actual,
    randomBytes: jest.fn(),
  };
});

interface IMockedAdminRepository {
  findById: jest.Mock;
}

interface IMockedRefreshTokenRepository {
  save: jest.Mock;
  findById: jest.Mock;
  deleteById: jest.Mock;
  deleteAndReturnById: jest.Mock;
}

interface IMockedHasher {
  hash: jest.Mock;
  compare: jest.Mock;
}

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let adminRepository: IMockedAdminRepository;
  let refreshTokenRepository: IMockedRefreshTokenRepository;
  let hasher: IMockedHasher;

  const admin = new Admin(
    'admin-id',
    'John',
    'Doe',
    'admin',
    'admin@portfolio.com',
    'hashed-password',
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );

  const originalExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const validStoredToken = new AdminRefreshToken(
    'token-id',
    'stored-hash',
    'Mozilla/5.0',
    originalExpiresAt,
    new Date(),
    admin.id,
  );

  beforeEach(async () => {
    (randomBytes as jest.Mock).mockReturnValue({
      toString: () => 'new-secret',
    });

    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        {
          provide: ADMIN_REPOSITORY,
          useValue: { findById: jest.fn() },
        },
        {
          provide: ADMIN_REFRESH_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            deleteById: jest.fn(),
            deleteAndReturnById: jest.fn(),
          },
        },
        { provide: HASHER, useValue: { hash: jest.fn(), compare: jest.fn() } },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('new-access-token') },
        },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
    adminRepository = module.get(ADMIN_REPOSITORY);
    refreshTokenRepository = module.get(ADMIN_REFRESH_TOKEN_REPOSITORY);
    hasher = module.get(HASHER);
  });

  // Valid refresh token should rotate the whitelist row and inherit the previous expiresAt
  it('should rotate the refresh token and return a new access token', async () => {
    let savedToken: AdminRefreshToken | undefined;
    refreshTokenRepository.deleteAndReturnById.mockResolvedValue(
      validStoredToken,
    );
    hasher.compare.mockResolvedValue(true);
    adminRepository.findById.mockResolvedValue(admin);
    hasher.hash.mockResolvedValue('new-hash');
    refreshTokenRepository.save.mockImplementation(
      (token: AdminRefreshToken) => {
        savedToken = token;
        return Promise.resolve(token);
      },
    );

    const result = await useCase.execute('token-id.old-secret', 'Mozilla/5.0');

    expect(refreshTokenRepository.deleteAndReturnById).toHaveBeenCalledWith(
      'token-id',
    );
    expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
    expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.rawRefreshToken).toContain('.new-secret');
    expect(result.expiresAt).toEqual(originalExpiresAt);
    expect(savedToken?.expiresAt).toEqual(originalExpiresAt);
  });

  // Missing or malformed cookie should be rejected before touching the repository
  it('should throw UnauthorizedException when the cookie is missing or malformed', async () => {
    await expect(useCase.execute(undefined, 'Mozilla/5.0')).rejects.toThrow(
      new UnauthorizedException(AUTH_MESSAGES.INVALID_SESSION),
    );
    expect(refreshTokenRepository.deleteAndReturnById).not.toHaveBeenCalled();
  });

  // Unknown or already-consumed token id should be rejected as an expired session
  it('should throw UnauthorizedException when the token id is not found', async () => {
    refreshTokenRepository.deleteAndReturnById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id.secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
  });

  // Expired token (already claimed/deleted) should be rejected without a second delete
  it('should reject an expired refresh token', async () => {
    const expiredToken = new AdminRefreshToken(
      'token-id',
      'stored-hash',
      'Mozilla/5.0',
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(),
      admin.id,
    );
    refreshTokenRepository.deleteAndReturnById.mockResolvedValue(expiredToken);

    await expect(
      useCase.execute('token-id.secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
    expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
  });

  // Secret mismatch should reject; row was already deleted by the atomic claim
  it('should reject when the secret does not match the stored hash', async () => {
    refreshTokenRepository.deleteAndReturnById.mockResolvedValue(
      validStoredToken,
    );
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute('token-id.wrong-secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
    expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
  });
});
