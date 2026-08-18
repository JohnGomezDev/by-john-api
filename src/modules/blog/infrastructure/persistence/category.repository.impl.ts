import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { CategoryTypeOrmEntity } from './typeorm/category.typeorm-entity';

@Injectable()
export class CategoryRepositoryImpl implements ICategoryRepository {
  constructor(
    @InjectRepository(CategoryTypeOrmEntity)
    private readonly ormRepo: Repository<CategoryTypeOrmEntity>,
  ) {}

  async findAll(): Promise<Category[]> {
    const entities = await this.ormRepo.find({
      order: { name: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(e: CategoryTypeOrmEntity): Category {
    return new Category(e.id, e.name, e.slug, e.createdAt, e.updatedAt);
  }
}
