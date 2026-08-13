import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Admin } from '../../domain/entities/admin.entity';
import type { IAdminRepository } from '../../domain/repositories/admin.repository.interface';
import { AdminTypeOrmEntity } from './typeorm/admin.typeorm-entity';

@Injectable()
export class AdminRepositoryImpl implements IAdminRepository {
  constructor(
    @InjectRepository(AdminTypeOrmEntity)
    private readonly ormRepo: Repository<AdminTypeOrmEntity>,
  ) {}

  async findByUsername(username: string): Promise<Admin | null> {
    const entity = await this.ormRepo.findOneBy({ username });
    return entity ? this.toDomain(entity) : null;
  }

  async findById(id: string): Promise<Admin | null> {
    const entity = await this.ormRepo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(e: AdminTypeOrmEntity): Admin {
    return new Admin(
      e.id,
      e.username,
      e.email,
      e.passwordHash,
      e.createdAt,
      e.updatedAt,
    );
  }
}
