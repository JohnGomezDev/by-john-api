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
import { LoginUseCase } from './login.use-case';

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

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let adminRepository: IMockedAdminRepository;
  let refreshTokenRepository: IMockedRefreshTokenRepository;
  let hasher: IMockedHasher;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  const admin = new Admin(
    'admin-id',
    'admin',
    'admin@portfolio.com',
    'hashed-password',
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );

  beforeEach(async () => {
    (randomBytes as jest.Mock).mockReturnValue({
      toString: () => 'random-secret',
    });

    jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };
    configService = { get: jest.fn().mockReturnValue('7') };

    const module = await Test.createTestingModule({
      providers: [
        LoginUseCase,
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
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
    adminRepository = module.get(ADMIN_REPOSITORY);
    refreshTokenRepository = module.get(ADMIN_REFRESH_TOKEN_REPOSITORY);
    hasher = module.get(HASHER);
  });

  // Successful login should return the access token, raw refresh token and admin
  it('should return tokens and admin on successful login', async () => {
    adminRepository.findByUsername.mockResolvedValue(admin);
    hasher.compare.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('hashed-secret');
    refreshTokenRepository.save.mockImplementation((token: AdminRefreshToken) =>
      Promise.resolve(token),
    );

    const result = await useCase.execute(
      { username: 'admin', password: 'plain' },
      'Mozilla/5.0',
    );

    expect(result.accessToken).toBe('signed-access-token');
    expect(result.admin).toBe(admin);
    expect(result.rawRefreshToken).toContain('.random-secret');
  });

  // Successful login should persist the refresh token in the whitelist
  it('should persist the refresh token on successful login', async () => {
    let savedToken: AdminRefreshToken | undefined;
    adminRepository.findByUsername.mockResolvedValue(admin);
    hasher.compare.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('hashed-secret');
    refreshTokenRepository.save.mockImplementation(
      (token: AdminRefreshToken) => {
        savedToken = token;
        return Promise.resolve(token);
      },
    );

    await useCase.execute(
      { username: 'admin', password: 'plain' },
      'Mozilla/5.0',
    );

    expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(savedToken?.adminId).toBe(admin.id);
    expect(savedToken?.tokenHash).toBe('hashed-secret');
    expect(savedToken?.userAgent).toBe('Mozilla/5.0');
  });

  // Non-existent username should be rejected with a generic message
  it('should throw UnauthorizedException when the username does not exist', async () => {
    adminRepository.findByUsername.mockResolvedValue(null);

    await expect(
      useCase.execute(
        { username: 'unknown', password: 'plain' },
        'Mozilla/5.0',
      ),
    ).rejects.toThrow(
      new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS),
    );
    expect(hasher.compare).not.toHaveBeenCalled();
  });

  // Wrong password should be rejected with the same generic message
  it('should throw UnauthorizedException when the password is incorrect', async () => {
    adminRepository.findByUsername.mockResolvedValue(admin);
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ username: 'admin', password: 'wrong' }, 'Mozilla/5.0'),
    ).rejects.toThrow(
      new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS),
    );
    expect(refreshTokenRepository.save).not.toHaveBeenCalled();
  });
});
