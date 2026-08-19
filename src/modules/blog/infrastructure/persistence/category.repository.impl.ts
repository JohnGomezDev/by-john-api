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

  async findById(id: string): Promise<Category | null> {
    const entity = await this.ormRepo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async save(category: Category): Promise<Category> {
    const saved = await this.ormRepo.save(this.toOrm(category));
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  private toOrm(category: Category): CategoryTypeOrmEntity {
    const entity = new CategoryTypeOrmEntity();
    entity.id = category.id;
    entity.name = category.name;
    entity.slug = category.slug;
    entity.createdAt = category.createdAt;
    entity.updatedAt = category.updatedAt;
    return entity;
  }

  private toDomain(e: CategoryTypeOrmEntity): Category {
    return new Category(e.id, e.name, e.slug, e.createdAt, e.updatedAt);
  }
}
