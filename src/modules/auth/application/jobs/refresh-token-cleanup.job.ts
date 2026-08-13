import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ADMIN_REFRESH_TOKEN_REPOSITORY,
  type IAdminRefreshTokenRepository,
} from '../../domain/repositories/admin-refresh-token.repository.interface';

@Injectable()
export class RefreshTokenCleanupJob {
  private readonly logger = new Logger(RefreshTokenCleanupJob.name);

  constructor(
    @Inject(ADMIN_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IAdminRefreshTokenRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const deletedCount = await this.refreshTokenRepository.deleteExpired();
    if (deletedCount > 0) {
      this.logger.log(`Removed ${deletedCount} expired refresh token(s)`);
    }
  }
}
