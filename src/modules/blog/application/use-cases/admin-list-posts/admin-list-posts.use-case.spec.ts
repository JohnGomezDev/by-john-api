import { Test } from '@nestjs/testing';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { Post } from '../../../domain/entities/post.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminListPostsUseCase } from './admin-list-posts.use-case';

interface IMockedPostRepository {
  findPaginated: jest.Mock;
}

describe('AdminListPostsUseCase', () => {
  let useCase: AdminListPostsUseCase;
  let postRepository: IMockedPostRepository;

  const adminId = '77777777-7777-7777-7777-777777777777';
  const categoryId = '88888888-8888-8888-8888-888888888888';

  const paginatedResult: Pagination<Post> = {
    items: [
      Post.create({
        title: 'Hello',
        slug: 'hello',
        content: 'Content',
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
        AdminListPostsUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findPaginated: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminListPostsUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // Empty dto should use default pagination values
  it('should call findPaginated with default page and limit', async () => {
    postRepository.findPaginated.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({}, adminId);

    expect(postRepository.findPaginated).toHaveBeenCalledWith(adminId, {
      page: 1,
      limit: 10,
      search: undefined,
    });
    expect(result).toBe(paginatedResult);
  });

  // Custom pagination and search should be forwarded to the repository
  it('should call findPaginated with provided page, limit and search', async () => {
    postRepository.findPaginated.mockResolvedValue(paginatedResult);

    await useCase.execute(
      { page: 2, limit: 20, search: 'nestjs' },
      adminId,
    );

    expect(postRepository.findPaginated).toHaveBeenCalledWith(adminId, {
      page: 2,
      limit: 20,
      search: 'nestjs',
    });
  });

  // Repository result should be returned unchanged
  it('should return the paginated result from the repository', async () => {
    postRepository.findPaginated.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({ page: 1, limit: 10 }, adminId);

    expect(result).toEqual(paginatedResult);
    expect(result.items).toHaveLength(1);
    expect(result.meta.currentPage).toBe(1);
  });
});
