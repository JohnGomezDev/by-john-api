import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Post } from '../../../domain/entities/post.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { AdminGetPostUseCase } from './admin-get-post.use-case';

interface IMockedPostRepository {
  findById: jest.Mock;
}

describe('AdminGetPostUseCase', () => {
  let useCase: AdminGetPostUseCase;
  let postRepository: IMockedPostRepository;

  const postId = '66666666-6666-6666-6666-666666666666';
  const adminId = '77777777-7777-7777-7777-777777777777';
  const otherAdminId = '99999999-9999-9999-9999-999999999999';
  const categoryId = '88888888-8888-8888-8888-888888888888';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminGetPostUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminGetPostUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // Owner should receive the post when it exists
  it('should return the post when it belongs to the admin', async () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      excerpt: 'Content',
      adminId,
      categoryId,
    });
    postRepository.findById.mockResolvedValue(post);

    const result = await useCase.execute(postId, adminId);

    expect(postRepository.findById).toHaveBeenCalledWith(postId);
    expect(result).toBe(post);
  });

  // Missing post should surface as NotFoundException
  it('should throw NotFoundException when the post does not exist', async () => {
    postRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(postId, adminId)).rejects.toThrow(
      new NotFoundException(`Post con id ${postId} no encontrado`),
    );
  });

  // Non-owner should be rejected with ForbiddenException
  it('should throw ForbiddenException when the post belongs to another admin', async () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      excerpt: 'Content',
      adminId,
      categoryId,
    });
    postRepository.findById.mockResolvedValue(post);

    await expect(useCase.execute(postId, otherAdminId)).rejects.toThrow(
      new ForbiddenException('No tienes permiso para acceder a este post'),
    );
  });
});
