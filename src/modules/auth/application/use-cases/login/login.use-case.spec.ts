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
}

interface IMockedRefreshTokenRepository {
  save: jest.Mock;
}

interface IMockedHasher {
  hash: jest.Mock;
  compare: jest.Mock;
}

interface IMockedJwtService {
  sign: jest.Mock;
}

interface IMockedConfigService {
  getOrThrow: jest.Mock;
}

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let adminRepository: IMockedAdminRepository;
  let refreshTokenRepository: IMockedRefreshTokenRepository;
  let hasher: IMockedHasher;
  let jwtService: IMockedJwtService;
  let configService: IMockedConfigService;

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

  beforeEach(async () => {
    (randomBytes as jest.Mock).mockReturnValue({
      toString: () => 'random-secret',
    });

    jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };
    configService = { getOrThrow: jest.fn().mockReturnValue('48') };

    const module = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: ADMIN_REPOSITORY,
          useValue: { findByUsername: jest.fn() },
        },
        {
          provide: ADMIN_REFRESH_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
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

  // Successful login should return the access token, raw refresh token, expiresAt and admin
  it('should return tokens and admin on successful login', async () => {
    const fixedNow = new Date('2026-01-15T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    try {
      adminRepository.findByUsername.mockResolvedValue(admin);
      hasher.compare.mockResolvedValue(true);
      hasher.hash.mockResolvedValue('hashed-secret');
      refreshTokenRepository.save.mockImplementation(
        (token: AdminRefreshToken) => Promise.resolve(token),
      );

      const result = await useCase.execute(
        { username: 'admin', password: 'plain' },
        'Mozilla/5.0',
      );

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.admin).toBe(admin);
      expect(result.rawRefreshToken).toContain('.random-secret');
      expect(result.expiresAt).toEqual(
        new Date(fixedNow.getTime() + 48 * 60 * 60 * 1000),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  // Successful login should persist the refresh token in the whitelist with a 48h TTL
  it('should persist the refresh token on successful login', async () => {
    let savedToken: AdminRefreshToken | undefined;
    const fixedNow = new Date('2026-01-15T10:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    try {
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
      expect(savedToken?.expiresAt).toEqual(
        new Date(fixedNow.getTime() + 48 * 60 * 60 * 1000),
      );
    } finally {
      jest.useRealTimers();
    }
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
