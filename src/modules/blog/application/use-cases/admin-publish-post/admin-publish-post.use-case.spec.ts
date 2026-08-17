import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Post } from '../../../domain/entities/post.entity';
import { Tag } from '../../../domain/entities/tag.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminPublishPostUseCase } from './admin-publish-post.use-case';

interface IMockedPostRepository {
  findById: jest.Mock;
  save: jest.Mock;
}

describe('AdminPublishPostUseCase', () => {
  let useCase: AdminPublishPostUseCase;
  let postRepository: IMockedPostRepository;

  const postId = '66666666-6666-6666-6666-666666666666';
  const adminId = '77777777-7777-7777-7777-777777777777';
  const otherAdminId = '99999999-9999-9999-9999-999999999999';
  const categoryId = '88888888-8888-8888-8888-888888888888';
  const tagId = '55555555-5555-5555-5555-555555555555';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const firstPublishedAt = new Date('2026-01-10T10:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    const module = await Test.createTestingModule({
      providers: [
        AdminPublishPostUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminPublishPostUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildDraftPost(): Post {
    const tag = new Tag(tagId, 'NestJS', 'nestjs', fixedNow, fixedNow);
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });
    return new Post(
      draft.id,
      draft.title,
      draft.slug,
      draft.content,
      draft.excerpt,
      draft.metaTitle,
      draft.metaDescription,
      draft.ogImageUrl,
      draft.published,
      draft.publishedAt,
      draft.createdAt,
      draft.updatedAt,
      draft.adminId,
      draft.categoryId,
      [tag],
    );
  }

  // Owner should publish the post and persist it with existing tag ids
  it('should publish and save the post with its tag ids', async () => {
    const post = buildDraftPost();
    postRepository.findById.mockResolvedValue(post);
    postRepository.save.mockImplementation(
      (published: Post, tagIds: string[]) => Promise.resolve(published),
    );

    const result = await useCase.execute(postId, adminId);

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: true,
        publishedAt: fixedNow,
      }),
      [tagId],
    );
    expect(result.published).toBe(true);
    expect(result.publishedAt).toEqual(fixedNow);
  });

  // Re-publishing should remain idempotent and keep the original publishedAt
  it('should keep publishedAt when re-publishing an already published post', async () => {
    const draft = buildDraftPost();
    const published = draft.publish();
    const alreadyPublished = new Post(
      published.id,
      published.title,
      published.slug,
      published.content,
      published.excerpt,
      published.metaTitle,
      published.metaDescription,
      published.ogImageUrl,
      true,
      firstPublishedAt,
      published.createdAt,
      published.updatedAt,
      published.adminId,
      published.categoryId,
      published.tags,
    );

    postRepository.findById.mockResolvedValue(alreadyPublished);
    postRepository.save.mockImplementation(
      (post: Post, tagIds: string[]) => Promise.resolve(post),
    );

    const result = await useCase.execute(postId, adminId);

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: true,
        publishedAt: firstPublishedAt,
      }),
      [tagId],
    );
    expect(result.publishedAt).toEqual(firstPublishedAt);
  });

  // Missing post should surface as NotFoundException
  it('should throw NotFoundException when the post does not exist', async () => {
    postRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(postId, adminId)).rejects.toThrow(
      new NotFoundException(`Post con id ${postId} no encontrado`),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });

  // Non-owner should be rejected with ForbiddenException
  it('should throw ForbiddenException when the post belongs to another admin', async () => {
    postRepository.findById.mockResolvedValue(buildDraftPost());

    await expect(useCase.execute(postId, otherAdminId)).rejects.toThrow(
      new ForbiddenException('No tienes permiso para publicar este post'),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });

  // Incomplete post should surface as BadRequestException
  it('should throw BadRequestException when the post is incomplete', async () => {
    const incomplete = new Post(
      postId,
      '',
      'slug',
      '',
      '',
      null,
      null,
      null,
      false,
      null,
      fixedNow,
      fixedNow,
      adminId,
      categoryId,
    );
    postRepository.findById.mockResolvedValue(incomplete);

    await expect(useCase.execute(postId, adminId)).rejects.toThrow(
      new BadRequestException('No se puede publicar un post incompleto'),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });
});
