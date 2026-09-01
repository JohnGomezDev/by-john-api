import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';
import { Tag } from '../../../domain/entities/tag.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminUpdatePostUseCase } from './admin-update-post.use-case';

interface IMockedPostRepository {
  findById: jest.Mock;
  save: jest.Mock;
}

describe('AdminUpdatePostUseCase', () => {
  let useCase: AdminUpdatePostUseCase;
  let postRepository: IMockedPostRepository;

  const postId = '66666666-6666-6666-6666-666666666666';
  const adminId = '77777777-7777-7777-7777-777777777777';
  const otherAdminId = '99999999-9999-9999-9999-999999999999';
  const categoryId = '88888888-8888-8888-8888-888888888888';
  const tagId = '55555555-5555-5555-5555-555555555555';
  const newTagId = '44444444-4444-4444-4444-444444444444';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  function buildPostWithTags(): Post {
    const tag = new Tag(tagId, 'NestJS', 'nestjs', fixedNow, fixedNow);
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      excerpt: 'Content',
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

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminUpdatePostUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminUpdatePostUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // Owner should update provided fields and persist the post
  it('should update and save the post with provided fields', async () => {
    const post = buildPostWithTags();
    postRepository.findById.mockResolvedValue(post);
    postRepository.save.mockImplementation((updated: Post) =>
      Promise.resolve(updated),
    );

    const result = await useCase.execute(
      postId,
      { title: 'Updated', slug: 'updated' },
      adminId,
    );

    expect(postRepository.findById).toHaveBeenCalledWith(postId);
    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated',
        slug: 'updated',
        content: 'Content',
      }),
      [tagId],
    );
    expect(result.title).toBe('Updated');
    expect(result.slug).toBe('updated');
  });

  // When tagIds are omitted, existing tag ids should be preserved
  it('should preserve existing tag ids when tagIds are not provided', async () => {
    const post = buildPostWithTags();
    postRepository.findById.mockResolvedValue(post);
    postRepository.save.mockImplementation((updated: Post) =>
      Promise.resolve(updated),
    );

    await useCase.execute(postId, { title: 'Updated' }, adminId);

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated' }),
      [tagId],
    );
  });

  // When tagIds are provided, they should replace the existing ones
  it('should save with new tag ids when tagIds are provided', async () => {
    const post = buildPostWithTags();
    postRepository.findById.mockResolvedValue(post);
    postRepository.save.mockImplementation((updated: Post) =>
      Promise.resolve(updated),
    );

    await useCase.execute(
      postId,
      { title: 'Updated', tagIds: [newTagId] },
      adminId,
    );

    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated' }),
      [newTagId],
    );
  });

  // Missing post should surface as NotFoundException
  it('should throw NotFoundException when the post does not exist', async () => {
    postRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(postId, { title: 'Updated' }, adminId),
    ).rejects.toThrow(
      new NotFoundException(`Post con id ${postId} no encontrado`),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });

  // Non-owner should be rejected with ForbiddenException
  it('should throw ForbiddenException when the post belongs to another admin', async () => {
    postRepository.findById.mockResolvedValue(buildPostWithTags());

    await expect(
      useCase.execute(postId, { title: 'Updated' }, otherAdminId),
    ).rejects.toThrow(
      new ForbiddenException('No tienes permiso para editar este post'),
    );
    expect(postRepository.save).not.toHaveBeenCalled();
  });

  // Duplicate slug should surface as ConflictException
  it('should throw ConflictException when slug already exists', async () => {
    postRepository.findById.mockResolvedValue(buildPostWithTags());
    postRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(
      useCase.execute(postId, { slug: 'duplicate-slug' }, adminId),
    ).rejects.toThrow(
      new ConflictException('El post con el slug duplicate-slug ya existe'),
    );
  });

  // Missing category should surface as NotFoundException
  it('should throw NotFoundException when category does not exist', async () => {
    postRepository.findById.mockResolvedValue(buildPostWithTags());
    postRepository.save.mockRejectedValue(buildQueryFailedError('23503'));

    await expect(
      useCase.execute(
        postId,
        { categoryId: '00000000-0000-0000-0000-000000000000' },
        adminId,
      ),
    ).rejects.toThrow(
      new NotFoundException('La categoría especificada no existe'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    postRepository.findById.mockResolvedValue(buildPostWithTags());
    postRepository.save.mockRejectedValue(unknownError);

    await expect(
      useCase.execute(postId, { title: 'Updated' }, adminId),
    ).rejects.toThrow(unknownError);
  });
});
