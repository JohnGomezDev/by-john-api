import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  paginate,
  type Pagination,
} from 'nestjs-typeorm-paginate';
import { In, type Repository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import { Post } from '../../domain/entities/post.entity';
import { Tag } from '../../domain/entities/tag.entity';
import type {
  IPostPaginateOptions,
  IPostPublishedPaginateOptions,
  IPostRepository,
} from '../../domain/repositories/post.repository.interface';
import { PostTypeOrmEntity } from './typeorm/post.typeorm-entity';
import { TagTypeOrmEntity } from './typeorm/tag.typeorm-entity';

@Injectable()
export class PostRepositoryImpl implements IPostRepository {
  constructor(
    @InjectRepository(PostTypeOrmEntity)
    private readonly ormRepo: Repository<PostTypeOrmEntity>,
    @InjectRepository(TagTypeOrmEntity)
    private readonly tagOrmRepo: Repository<TagTypeOrmEntity>,
  ) {}

  async save(post: Post, tagIds: string[]): Promise<Post> {
    const ormEntity = this.toOrm(post);

    if (tagIds.length > 0) {
      ormEntity.tags = await this.tagOrmRepo.findBy({ id: In(tagIds) });
    } else {
      ormEntity.tags = [];
    }

    const saved = await this.ormRepo.save(ormEntity);
    const withRelations = await this.ormRepo.findOne({
      where: { id: saved.id },
      relations: {
        tags: true,
        category: true,
        admin: true,
      },
    });

    return this.toDomain(withRelations ?? saved);
  }

  async findById(id: string): Promise<Post | null> {
    const entity = await this.ormRepo.findOne({
      where: { id },
      relations: {
        tags: true,
        category: true,
        admin: true,
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete({ id });
  }

  async findPaginated(
    adminId: string,
    options: IPostPaginateOptions,
  ): Promise<Pagination<Post>> {
    const qb = this.ormRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.admin', 'admin')
      .where('post.admin_id = :adminId', { adminId })
      .orderBy('post.published_at', 'DESC', 'NULLS LAST');

    if (options.search?.trim()) {
      qb.andWhere(
        "post.search_vector @@ plainto_tsquery('spanish', :search)",
        { search: options.search.trim() },
      );
    }

    const result = await paginate<PostTypeOrmEntity>(qb, {
      page: options.page,
      limit: options.limit,
    });

    return {
      ...result,
      items: result.items.map((item) => this.toDomain(item)),
    };
  }

  async findPublishedBySlug(slug: string): Promise<Post | null> {
    const entity = await this.ormRepo.findOne({
      where: { slug, published: true },
      relations: {
        tags: true,
        category: true,
        admin: true,
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findPublishedPaginated(
    options: IPostPublishedPaginateOptions,
  ): Promise<Pagination<Post>> {
    const qb = this.ormRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.admin', 'admin')
      .where('post.published = :published', { published: true })
      .orderBy('post.published_at', 'DESC');

    if (options.categorySlug?.trim()) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: options.categorySlug.trim(),
      });
    }

    if (options.search?.trim()) {
      qb.andWhere(
        "post.search_vector @@ plainto_tsquery('spanish', :search)",
        { search: options.search.trim() },
      );
    }

    const result = await paginate<PostTypeOrmEntity>(qb, {
      page: options.page,
      limit: options.limit,
    });

    return {
      ...result,
      items: result.items.map((item) => this.toDomain(item)),
    };
  }

  private toOrm(post: Post): PostTypeOrmEntity {
    const e = new PostTypeOrmEntity();
    e.id = post.id;
    e.title = post.title;
    e.slug = post.slug;
    e.content = post.content;
    e.excerpt = post.excerpt;
    e.metaTitle = post.metaTitle;
    e.metaDescription = post.metaDescription;
    e.ogImageUrl = post.ogImageUrl;
    e.published = post.published;
    e.publishedAt = post.publishedAt;
    e.createdAt = post.createdAt;
    e.updatedAt = post.updatedAt;
    e.adminId = post.adminId;
    e.categoryId = post.categoryId;
    return e;
  }

  private toDomain(e: PostTypeOrmEntity): Post {
    const tags = (e.tags ?? []).map(
      (tag) =>
        new Tag(tag.id, tag.name, tag.slug, tag.createdAt, tag.updatedAt),
    );

    const category = e.category
      ? new Category(
          e.category.id,
          e.category.name,
          e.category.slug,
          e.category.createdAt,
          e.category.updatedAt,
        )
      : null;

    const adminInfo = e.admin
      ? {
          id: e.admin.id,
          name: e.admin.name,
          lastName: e.admin.lastName,
        }
      : null;

    return new Post(
      e.id,
      e.title,
      e.slug,
      e.content,
      e.excerpt,
      e.metaTitle,
      e.metaDescription,
      e.ogImageUrl,
      e.published,
      e.publishedAt,
      e.createdAt,
      e.updatedAt,
      e.adminId,
      e.categoryId,
      tags,
      category,
      adminInfo,
    );
  }
}
