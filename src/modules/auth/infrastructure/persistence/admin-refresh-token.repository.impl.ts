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
}
