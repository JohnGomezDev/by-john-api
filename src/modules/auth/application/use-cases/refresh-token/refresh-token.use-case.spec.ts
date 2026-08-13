import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  findByUsername: jest.Mock;
  findById: jest.Mock;
}

interface IMockedRefreshTokenRepository {
  save: jest.Mock;
  findById: jest.Mock;
  deleteById: jest.Mock;
  deleteExpired: jest.Mock;
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
    'admin',
    'admin@portfolio.com',
    'hashed-password',
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );

  const validStoredToken = new AdminRefreshToken(
    'token-id',
    'stored-hash',
    'Mozilla/5.0',
    new Date(Date.now() + 60 * 60 * 1000),
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
          useValue: { findByUsername: jest.fn(), findById: jest.fn() },
        },
        {
          provide: ADMIN_REFRESH_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            deleteById: jest.fn(),
            deleteExpired: jest.fn(),
          },
        },
        { provide: HASHER, useValue: { hash: jest.fn(), compare: jest.fn() } },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('new-access-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('7') },
        },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
    adminRepository = module.get(ADMIN_REPOSITORY);
    refreshTokenRepository = module.get(ADMIN_REFRESH_TOKEN_REPOSITORY);
    hasher = module.get(HASHER);
  });

  // Valid refresh token should rotate the whitelist row and return new tokens
  it('should rotate the refresh token and return a new access token', async () => {
    refreshTokenRepository.findById.mockResolvedValue(validStoredToken);
    hasher.compare.mockResolvedValue(true);
    adminRepository.findById.mockResolvedValue(admin);
    hasher.hash.mockResolvedValue('new-hash');
    refreshTokenRepository.save.mockImplementation((token: AdminRefreshToken) =>
      Promise.resolve(token),
    );

    const result = await useCase.execute('token-id.old-secret', 'Mozilla/5.0');

    expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('token-id');
    expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.rawRefreshToken).toContain('.new-secret');
  });

  // Missing or malformed cookie should be rejected before touching the repository
  it('should throw UnauthorizedException when the cookie is missing or malformed', async () => {
    await expect(useCase.execute(undefined, 'Mozilla/5.0')).rejects.toThrow(
      new UnauthorizedException(AUTH_MESSAGES.INVALID_SESSION),
    );
    expect(refreshTokenRepository.findById).not.toHaveBeenCalled();
  });

  // Unknown token id should be rejected as an expired session
  it('should throw UnauthorizedException when the token id is not found', async () => {
    refreshTokenRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id.secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
  });

  // Expired token should be deleted and rejected
  it('should delete and reject an expired refresh token', async () => {
    const expiredToken = new AdminRefreshToken(
      'token-id',
      'stored-hash',
      'Mozilla/5.0',
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(),
      admin.id,
    );
    refreshTokenRepository.findById.mockResolvedValue(expiredToken);

    await expect(
      useCase.execute('token-id.secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
    expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('token-id');
  });

  // Secret mismatch should delete the row (possible theft) and reject
  it('should delete and reject when the secret does not match the stored hash', async () => {
    refreshTokenRepository.findById.mockResolvedValue(validStoredToken);
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute('token-id.wrong-secret', 'Mozilla/5.0'),
    ).rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION));
    expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('token-id');
  });
});
