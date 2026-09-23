import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminCreatePostUseCase } from './admin-create-post.use-case';

interface IMockedPostRepository {
  save: jest.Mock;
}

describe('AdminCreatePostUseCase', () => {
  let useCase: AdminCreatePostUseCase;
  let postRepository: IMockedPostRepository;

  const adminId = '77777777-7777-7777-7777-777777777777';
  const categoryId = '88888888-8888-8888-8888-888888888888';
  const tagId = '55555555-5555-5555-5555-555555555555';

  const createDto = {
    title: 'Hello',
    slug: 'hello',
    content: 'Content',
    excerpt: 'Content',
    categoryId,
    tagIds: [tagId],
  };

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminCreatePostUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminCreatePostUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // A valid dto should create an unpublished post and persist it with tag ids
  it('should create and save an unpublished post', async () => {
    postRepository.save.mockImplementation((post: Post) =>
      Promise.resolve(post),
    );

    const result = await useCase.execute(createDto, adminId);

    expect(postRepository.save).toHaveBeenCalledTimes(1);
    expect(postRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hello',
        slug: 'hello',
        content: 'Content',
        published: false,
        publishedAt: null,
        adminId,
        categoryId,
      }),
      [tagId],
    );
    expect(result.published).toBe(false);
    expect(result.publishedAt).toBeNull();
  });

  // Duplicate slug should surface as ConflictException
  it('should throw ConflictException when slug already exists', async () => {
    postRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(useCase.execute(createDto, adminId)).rejects.toThrow(
      new ConflictException('El post con el slug hello ya existe'),
    );
  });

  // Missing category should surface as NotFoundException
  it('should throw NotFoundException when category does not exist', async () => {
    postRepository.save.mockRejectedValue(buildQueryFailedError('23503'));

    await expect(useCase.execute(createDto, adminId)).rejects.toThrow(
      new NotFoundException('La categoría especificada no existe'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    postRepository.save.mockRejectedValue(unknownError);

    await expect(useCase.execute(createDto, adminId)).rejects.toThrow(
      unknownError,
    );
  });
});
