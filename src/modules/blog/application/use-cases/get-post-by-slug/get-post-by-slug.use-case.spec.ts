import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Post } from '../../../domain/entities/post.entity';
import { POST_REPOSITORY } from '../../../domain/repositories/post.repository.interface';
import { GetPostBySlugUseCase } from './get-post-by-slug.use-case';

interface IMockedPostRepository {
  findPublishedBySlug: jest.Mock;
}

describe('GetPostBySlugUseCase', () => {
  let useCase: GetPostBySlugUseCase;
  let postRepository: IMockedPostRepository;

  const slug = 'hello';
  const adminId = '77777777-7777-7777-7777-777777777777';
  const categoryId = '88888888-8888-8888-8888-888888888888';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetPostBySlugUseCase,
        {
          provide: POST_REPOSITORY,
          useValue: {
            findPublishedBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetPostBySlugUseCase);
    postRepository = module.get(POST_REPOSITORY);
  });

  // Published post should be returned when it exists
  it('should return the post when it is published and the slug matches', async () => {
    const post = Post.create({
      title: 'Hello',
      slug,
      content: 'Content',
      adminId,
      categoryId,
    });
    postRepository.findPublishedBySlug.mockResolvedValue(post);

    const result = await useCase.execute(slug);

    expect(postRepository.findPublishedBySlug).toHaveBeenCalledWith(slug);
    expect(result).toBe(post);
  });

  // Missing or unpublished post should surface as NotFoundException
  it('should throw NotFoundException when the post does not exist', async () => {
    postRepository.findPublishedBySlug.mockResolvedValue(null);

    await expect(useCase.execute(slug)).rejects.toThrow(
      new NotFoundException(`Post con slug ${slug} no encontrado`),
    );
  });
});
