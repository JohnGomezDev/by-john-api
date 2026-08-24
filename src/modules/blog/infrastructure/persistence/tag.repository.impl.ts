import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Tag } from '../../domain/entities/tag.entity';
import type { ITagRepository } from '../../domain/repositories/tag.repository.interface';
import { TagTypeOrmEntity } from './typeorm/tag.typeorm-entity';

@Injectable()
export class TagRepositoryImpl implements ITagRepository {
  constructor(
    @InjectRepository(TagTypeOrmEntity)
    private readonly ormRepo: Repository<TagTypeOrmEntity>,
  ) {}

  async findAll(): Promise<Tag[]> {
    const entities = await this.ormRepo.find({
      order: { name: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findById(id: string): Promise<Tag | null> {
    const entity = await this.ormRepo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async save(tag: Tag): Promise<Tag> {
    const saved = await this.ormRepo.save(this.toOrm(tag));
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  private toOrm(tag: Tag): TagTypeOrmEntity {
    const entity = new TagTypeOrmEntity();
    entity.id = tag.id;
    entity.name = tag.name;
    entity.slug = tag.slug;
    entity.createdAt = tag.createdAt;
    entity.updatedAt = tag.updatedAt;
    return entity;
  }

  private toDomain(e: TagTypeOrmEntity): Tag {
    return new Tag(e.id, e.name, e.slug, e.createdAt, e.updatedAt);
  }
}
