import type { AdminRefreshToken } from '../entities/admin-refresh-token.entity';

export const ADMIN_REFRESH_TOKEN_REPOSITORY = 'ADMIN_REFRESH_TOKEN_REPOSITORY';

export interface IAdminRefreshTokenRepository {
  save(token: AdminRefreshToken): Promise<AdminRefreshToken>;
  findById(id: string): Promise<AdminRefreshToken | null>;
  deleteById(id: string): Promise<void>;
  /** Removes all whitelist rows whose expiresAt is in the past. Returns the count removed. */
  deleteExpired(): Promise<number>;
}
