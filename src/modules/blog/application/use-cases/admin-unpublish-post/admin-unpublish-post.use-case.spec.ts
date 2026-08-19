import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Post } from '../../../domain/entities/post.entity';
import { Tag } from '../../../domain/entities/tag.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminUnpublishPostUseCase } from './admin-unpublish-post.use-case';

interface IMockedPostRepository {
  findById: jest.Mock;
  save: jest.Mock;
}

describe('AdminUnpublishPostUseCase', () => {
  let useCase: AdminUnpublishPostUseCase;
  let postRepository: IMockedPostRepository;

  const postId = '66666666-6666-6666-6666-666666666666';
  const adminId = '77777777-7777-7777-7777-777777777777';
  const otherAdminId = '99999999-9999-9999-9999-999999999999';
  const categoryId = '88888888-8888-8888-8888-888888888888';
  const tagId = '55555555-5555-5555-5555-555555555555';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const publishedAt = new Date('2026-01-10T10:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    const module = await Test.createTestingModule({
      providers: [
        AdminUnpublishPostUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminUnpublishPostUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildPublishedPost(): Post {
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
      true,
      publishedAt,
      draft.createdAt,
      draft.updatedAt,
      draft.adminId,
      draft.categoryId,
      [tag],
    );
  }

  // Owner should unpublish the post while preserving publishedAt
  it('should unpublish and save the post preserving publishedAt', async () => {
    const post = buildPublishedPost();
    postRepository.findById.mockResolvedValue(post);
    postRepository.save.mockImplementation(
      (unpublished: Post, tagIds: string[]) => Promise.resolve(unpublished),
    );

    const result = await useCase.execute(postId, adminId);

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: false,
        publishedAt,
      }),
      [tagId],
    );
    expect(result.published).toBe(false);
    expect(result.publishedAt).toEqual(publishedAt);
  });

  // Unpublishing a draft should remain idempotent
  it('should remain draft when unpublishing an already draft post', async () => {
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });
    postRepository.findById.mockResolvedValue(draft);
    postRepository.save.mockImplementation((post: Post, tagIds: string[]) =>
      Promise.resolve(post),
    );

    const result = await useCase.execute(postId, adminId);

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: false,
        publishedAt: null,
      }),
      [],
    );
    expect(result.published).toBe(false);
    expect(result.publishedAt).toBeNull();
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
    postRepository.findById.mockResolvedValue(buildPublishedPost());

    await expect(useCase.execute(postId, otherAdminId)).rejects.toThrow(
      new ForbiddenException('No tienes permiso para despublicar este post'),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });
});
