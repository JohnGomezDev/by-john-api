import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import {
  ADMIN_REPOSITORY,
  type IAdminRepository,
} from '../../../../admin/domain/repositories/admin.repository.interface';
import {
  HASHER,
  type IHasher,
} from '../../../../../common/security/hasher.interface';
import { AdminRefreshToken } from '../../../domain/entities/admin-refresh-token.entity';
import {
  ADMIN_REFRESH_TOKEN_REPOSITORY,
  type IAdminRefreshTokenRepository,
} from '../../../domain/repositories/admin-refresh-token.repository.interface';
import { AUTH_MESSAGES } from '../../constants/auth-messages.constants';
import {
  buildRawRefreshToken,
  parseRawRefreshToken,
} from '../../utils/refresh-token-codec.util';

export interface IRefreshTokenResult {
  accessToken: string;
  rawRefreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IAdminRefreshTokenRepository,
    @Inject(HASHER)
    private readonly hasher: IHasher,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    rawCookieValue: string | undefined,
    userAgent: string,
  ): Promise<IRefreshTokenResult> {
    const parsed = parseRawRefreshToken(rawCookieValue);
    if (!parsed) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_SESSION);
    }

    // Atomic claim: only one concurrent refresh can delete+receive the row.
    const storedToken = await this.refreshTokenRepository.deleteAndReturnById(
      parsed.id,
    );
    if (!storedToken) {
      throw new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION);
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION);
    }

    const secretMatches = await this.hasher.compare(
      parsed.secret,
      storedToken.tokenHash,
    );
    if (!secretMatches) {
      // Row already deleted by the atomic claim — theft/replay is revoked.
      throw new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION);
    }

    const admin = await this.adminRepository.findById(storedToken.adminId);
    if (!admin) {
      throw new UnauthorizedException(AUTH_MESSAGES.EXPIRED_SESSION);
    }

    const secret = randomBytes(32).toString('hex');
    // Inherit the previous expiry so a session never extends past the original login window.
    const newRefreshToken = AdminRefreshToken.create({
      tokenHash: await this.hasher.hash(secret),
      userAgent,
      expiresAt: storedToken.expiresAt,
      adminId: admin.id,
    });
    const savedRefreshToken =
      await this.refreshTokenRepository.save(newRefreshToken);

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      name: admin.name,
      lastName: admin.lastName,
      username: admin.username,
    });

    return {
      accessToken,
      rawRefreshToken: buildRawRefreshToken(savedRefreshToken.id, secret),
      expiresAt: savedRefreshToken.expiresAt,
    };
  }
}
