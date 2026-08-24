import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { In, Like, type Repository } from 'typeorm';
import { AdminTypeOrmEntity } from '../../src/modules/admin/infrastructure/persistence/typeorm/admin.typeorm-entity';
import { AdminRefreshTokenTypeOrmEntity } from '../../src/modules/auth/infrastructure/persistence/typeorm/admin-refresh-token.typeorm-entity';
import { CategoryTypeOrmEntity } from '../../src/modules/blog/infrastructure/persistence/typeorm/category.typeorm-entity';
import { PostTypeOrmEntity } from '../../src/modules/blog/infrastructure/persistence/typeorm/post.typeorm-entity';
import { TagTypeOrmEntity } from '../../src/modules/blog/infrastructure/persistence/typeorm/tag.typeorm-entity';
import { SongTypeOrmEntity } from '../../src/modules/songs/infrastructure/persistence/typeorm/song.typeorm-entity';

export interface IE2eAdminInput {
  username: string;
  password: string;
  email: string;
  name: string;
  lastName: string;
}

export interface IE2ePostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: boolean;
  publishedAt?: Date | null;
  adminId: string;
  categoryId: string;
  tagIds?: string[];
}

export function getAdminRepository(
  app: INestApplication,
): Repository<AdminTypeOrmEntity> {
  return app.get(getRepositoryToken(AdminTypeOrmEntity));
}

export function getRefreshTokenRepository(
  app: INestApplication,
): Repository<AdminRefreshTokenTypeOrmEntity> {
  return app.get(getRepositoryToken(AdminRefreshTokenTypeOrmEntity));
}

export function getCategoryRepository(
  app: INestApplication,
): Repository<CategoryTypeOrmEntity> {
  return app.get(getRepositoryToken(CategoryTypeOrmEntity));
}

export function getTagRepository(
  app: INestApplication,
): Repository<TagTypeOrmEntity> {
  return app.get(getRepositoryToken(TagTypeOrmEntity));
}

export function getPostRepository(
  app: INestApplication,
): Repository<PostTypeOrmEntity> {
  return app.get(getRepositoryToken(PostTypeOrmEntity));
}

export function getSongRepository(
  app: INestApplication,
): Repository<SongTypeOrmEntity> {
  return app.get(getRepositoryToken(SongTypeOrmEntity));
}

export async function upsertAdmin(
  app: INestApplication,
  input: IE2eAdminInput,
): Promise<AdminTypeOrmEntity> {
  const adminRepo = getAdminRepository(app);
  const refreshRepo = getRefreshTokenRepository(app);
  const existing = await adminRepo.findOne({
    where: [{ username: input.username }, { email: input.email }],
  });

  if (existing) {
    await refreshRepo.delete({ adminId: existing.id });
    await adminRepo.delete({ id: existing.id });
  }

  const now = new Date();
  const admin = adminRepo.create({
    id: randomUUID(),
    username: input.username,
    email: input.email,
    name: input.name,
    lastName: input.lastName,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: now,
    updatedAt: now,
  });

  return adminRepo.save(admin);
}

export async function upsertCategory(
  app: INestApplication,
  input: { name: string; slug: string },
): Promise<CategoryTypeOrmEntity> {
  const repo = getCategoryRepository(app);
  const existing = await repo.findOne({
    where: [{ slug: input.slug }, { name: input.name }],
  });
  if (existing) {
    return existing;
  }

  const now = new Date();
  return repo.save(
    repo.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export async function upsertTag(
  app: INestApplication,
  input: { name: string; slug: string },
): Promise<TagTypeOrmEntity> {
  const repo = getTagRepository(app);
  const existing = await repo.findOne({
    where: [{ slug: input.slug }, { name: input.name }],
  });
  if (existing) {
    return existing;
  }

  const now = new Date();
  return repo.save(
    repo.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export async function insertPost(
  app: INestApplication,
  input: IE2ePostInput,
): Promise<PostTypeOrmEntity> {
  const postRepo = getPostRepository(app);
  const tagRepo = getTagRepository(app);

  const existing = await postRepo.findOne({ where: { slug: input.slug } });
  if (existing) {
    await deletePostsByIds(app, [existing.id]);
  }

  const now = new Date();
  const post = postRepo.create({
    id: randomUUID(),
    title: input.title,
    slug: input.slug,
    content: input.content,
    excerpt: input.excerpt ?? input.content.slice(0, 160),
    metaTitle: null,
    metaDescription: null,
    ogImageUrl: null,
    published: input.published,
    publishedAt: input.published
      ? (input.publishedAt ?? now)
      : (input.publishedAt ?? null),
    createdAt: now,
    updatedAt: now,
    adminId: input.adminId,
    categoryId: input.categoryId,
  });

  if (input.tagIds?.length) {
    post.tags = await tagRepo.findBy({ id: In(input.tagIds) });
  }

  return postRepo.save(post);
}

export async function insertSong(
  app: INestApplication,
  overrides?: Partial<SongTypeOrmEntity>,
): Promise<SongTypeOrmEntity> {
  const repo = getSongRepository(app);
  const now = new Date();
  return repo.save(
    repo.create({
      trackId: 'e2e-3135556',
      trackName: 'E2E Favorite Track',
      artists: [
        {
          id: '13',
          name: 'E2E Artist',
          url: 'https://www.deezer.com/artist/13',
        },
      ],
      albumId: '302127',
      albumName: 'E2E Album',
      albumCoverUrl: 'https://example.com/cover.jpg',
      url: 'https://www.deezer.com/track/3135556',
      previewUrl: 'https://example.com/preview.mp3',
      durationMs: 326000,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }),
  );
}

export async function deletePostsByIds(
  app: INestApplication,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const postRepo = getPostRepository(app);
  await postRepo.manager
    .createQueryBuilder()
    .delete()
    .from('post_tag')
    .where('post_id IN (:...ids)', { ids })
    .execute();
  await postRepo.delete({ id: In(ids) });
}

export async function deletePostsBySlugPrefix(
  app: INestApplication,
  slugPrefix: string,
): Promise<void> {
  const postRepo = getPostRepository(app);
  const posts = await postRepo.find({
    where: { slug: Like(`${slugPrefix}%`) },
  });
  await deletePostsByIds(
    app,
    posts.map((post) => post.id),
  );
}

export async function deleteCategoriesBySlugPrefix(
  app: INestApplication,
  slugPrefix: string,
): Promise<void> {
  await getCategoryRepository(app).delete({ slug: Like(`${slugPrefix}%`) });
}

export async function deleteTagsBySlugPrefix(
  app: INestApplication,
  slugPrefix: string,
): Promise<void> {
  await getTagRepository(app).delete({ slug: Like(`${slugPrefix}%`) });
}

export async function deleteAdminsByUsernames(
  app: INestApplication,
  usernames: string[],
): Promise<void> {
  const adminRepo = getAdminRepository(app);
  const refreshRepo = getRefreshTokenRepository(app);
  const admins = await adminRepo.find({ where: { username: In(usernames) } });
  const adminIds = admins.map((admin) => admin.id);
  if (adminIds.length > 0) {
    await refreshRepo.delete({ adminId: In(adminIds) });
    await adminRepo.delete({ id: In(adminIds) });
  }
}

export async function deleteAllSongs(app: INestApplication): Promise<void> {
  await getSongRepository(app).clear();
}

export async function deleteRefreshTokensForAdmin(
  app: INestApplication,
  adminId: string,
): Promise<void> {
  await getRefreshTokenRepository(app).delete({ adminId });
}
