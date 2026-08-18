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

  private toDomain(e: TagTypeOrmEntity): Tag {
    return new Tag(e.id, e.name, e.slug, e.createdAt, e.updatedAt);
  }
}
