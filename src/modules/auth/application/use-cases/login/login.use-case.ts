import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Admin } from '../../../../admin/domain/entities/admin.entity';
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
import { buildRawRefreshToken } from '../../utils/refresh-token-codec.util';

export interface ILoginDto {
  username: string;
  password: string;
}

export interface ILoginResult {
  accessToken: string;
  rawRefreshToken: string;
  expiresAt: Date;
  admin: Admin;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IAdminRefreshTokenRepository,
    @Inject(HASHER)
    private readonly hasher: IHasher,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: ILoginDto, userAgent: string): Promise<ILoginResult> {
    const admin = await this.adminRepository.findByUsername(dto.username);
    if (!admin) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.hasher.compare(
      dto.password,
      admin.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const secret = randomBytes(32).toString('hex');
    const ttlHours = Number(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_HOURS'),
    );
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const refreshToken = AdminRefreshToken.create({
      tokenHash: await this.hasher.hash(secret),
      userAgent,
      expiresAt,
      adminId: admin.id,
    });
    const savedRefreshToken =
      await this.refreshTokenRepository.save(refreshToken);

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
    });

    return {
      accessToken,
      rawRefreshToken: buildRawRefreshToken(savedRefreshToken.id, secret),
      expiresAt: savedRefreshToken.expiresAt,
      admin,
    };
  }
}
