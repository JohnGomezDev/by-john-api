import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, type Repository } from 'typeorm';
import { AdminRefreshToken } from '../../domain/entities/admin-refresh-token.entity';
import type { IAdminRefreshTokenRepository } from '../../domain/repositories/admin-refresh-token.repository.interface';
import { AdminRefreshTokenTypeOrmEntity } from './typeorm/admin-refresh-token.typeorm-entity';

@Injectable()
export class AdminRefreshTokenRepositoryImpl implements IAdminRefreshTokenRepository {
  constructor(
    @InjectRepository(AdminRefreshTokenTypeOrmEntity)
    private readonly ormRepo: Repository<AdminRefreshTokenTypeOrmEntity>,
  ) {}

  async save(token: AdminRefreshToken): Promise<AdminRefreshToken> {
    const saved = await this.ormRepo.save(this.toOrm(token));
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<AdminRefreshToken | null> {
    const entity = await this.ormRepo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  async deleteAndReturnById(id: string): Promise<AdminRefreshToken | null> {
    const result = await this.ormRepo
      .createQueryBuilder()
      .delete()
      .from(AdminRefreshTokenTypeOrmEntity)
      .where('id = :id', { id })
      .returning('*')
      .execute();

    const raw = (result.raw as Array<Record<string, string | Date>>)[0];
    return raw ? this.toDomainFromRaw(raw) : null;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.ormRepo.delete({
      expiresAt: LessThanOrEqual(new Date()),
    });
    return result.affected ?? 0;
  }

  private toOrm(token: AdminRefreshToken): AdminRefreshTokenTypeOrmEntity {
    const e = new AdminRefreshTokenTypeOrmEntity();
    e.id = token.id;
    e.tokenHash = token.tokenHash;
    e.userAgent = token.userAgent;
    e.expiresAt = token.expiresAt;
    e.createdAt = token.createdAt;
    e.adminId = token.adminId;
    return e;
  }

  private toDomain(e: AdminRefreshTokenTypeOrmEntity): AdminRefreshToken {
    return new AdminRefreshToken(
      e.id,
      e.tokenHash,
      e.userAgent,
      e.expiresAt,
      e.createdAt,
      e.adminId,
    );
  }

  /**
   * Maps a DELETE … RETURNING * row to the domain entity.
   * TypeORM may expose columns as snake_case (DB names) or camelCase (entity props).
   */
  private toDomainFromRaw(
    raw: Record<string, string | Date>,
  ): AdminRefreshToken {
    const tokenHash = raw.token_hash ?? raw.tokenHash;
    const userAgent = raw.user_agent ?? raw.userAgent;
    const expiresAt = raw.expires_at ?? raw.expiresAt;
    const createdAt = raw.created_at ?? raw.createdAt;
    const adminId = raw.admin_id ?? raw.adminId;

    return new AdminRefreshToken(
      String(raw.id),
      String(tokenHash),
      String(userAgent),
      expiresAt instanceof Date ? expiresAt : new Date(String(expiresAt)),
      createdAt instanceof Date ? createdAt : new Date(String(createdAt)),
      String(adminId),
    );
  }
}
