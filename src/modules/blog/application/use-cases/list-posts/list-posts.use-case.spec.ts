import { Test } from '@nestjs/testing';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { Post } from '../../../domain/entities/post.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { ListPostsUseCase } from './list-posts.use-case';

interface IMockedPostRepository {
  findPublishedPaginated: jest.Mock;
}

describe('ListPostsUseCase', () => {
  let useCase: ListPostsUseCase;
  let postRepository: IMockedPostRepository;

  const adminId = '77777777-7777-7777-7777-777777777777';
  const categoryId = '88888888-8888-8888-8888-888888888888';

  const paginatedResult: Pagination<Post> = {
    items: [
      Post.create({
        title: 'Hello',
        slug: 'hello',
        content: 'Content',
        excerpt: 'Content',
        adminId,
        categoryId,
      }),
    ],
    meta: {
      itemCount: 1,
      totalItems: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 1,
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListPostsUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findPublishedPaginated: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ListPostsUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // Empty dto should use default pagination values
  it('should call findPublishedPaginated with default page and limit', async () => {
    postRepository.findPublishedPaginated.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({});

    expect(postRepository.findPublishedPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      categorySlug: undefined,
    });
    expect(result).toBe(paginatedResult);
  });

  // Custom pagination and search should be forwarded to the repository
  it('should call findPublishedPaginated with provided page, limit and search', async () => {
    postRepository.findPublishedPaginated.mockResolvedValue(paginatedResult);

    await useCase.execute({ page: 2, limit: 20, search: 'nestjs' });

    expect(postRepository.findPublishedPaginated).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: 'nestjs',
      categorySlug: undefined,
    });
  });

  // Category filter should be forwarded to the repository
  it('should call findPublishedPaginated with the provided categorySlug', async () => {
    postRepository.findPublishedPaginated.mockResolvedValue(paginatedResult);

    await useCase.execute({ categorySlug: 'backend' });

    expect(postRepository.findPublishedPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      categorySlug: 'backend',
    });
  });

  // Repository result should be returned unchanged
  it('should return the paginated result from the repository', async () => {
    postRepository.findPublishedPaginated.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result).toEqual(paginatedResult);
    expect(result.items).toHaveLength(1);
    expect(result.meta.currentPage).toBe(1);
  });
});
