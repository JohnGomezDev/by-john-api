import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_REFRESH_TOKEN_REPOSITORY,
  type IAdminRefreshTokenRepository,
} from '../../../domain/repositories/admin-refresh-token.repository.interface';
import { parseRawRefreshToken } from '../../utils/refresh-token-codec.util';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(ADMIN_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IAdminRefreshTokenRepository,
  ) {}

  /**
   * Idempotent by design: an absent or malformed cookie is not an error,
   * the caller always ends up logged out either way.
   */
  async execute(rawCookieValue: string | undefined): Promise<void> {
    const parsed = parseRawRefreshToken(rawCookieValue);
    if (!parsed) {
      return;
    }

    await this.refreshTokenRepository.deleteById(parsed.id);
  }
}
