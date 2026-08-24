import { Test } from '@nestjs/testing';
import { Tag } from '../../../domain/entities/tag.entity';
import { TAG_REPOSITORY } from '../../../domain/repositories/tag.repository.interface';
import { ListTagsUseCase } from './list-tags.use-case';

interface IMockedTagRepository {
  findAll: jest.Mock;
}

describe('ListTagsUseCase', () => {
  let useCase: ListTagsUseCase;
  let tagRepository: IMockedTagRepository;

  const tags = [
    Tag.create({ name: 'NestJS', slug: 'nestjs' }),
    Tag.create({ name: 'TypeScript', slug: 'typescript' }),
  ];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListTagsUseCase,
        {
          provide: TAG_REPOSITORY,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ListTagsUseCase);
    tagRepository = module.get(TAG_REPOSITORY);
  });

  // Repository result should be returned unchanged
  it('should return the tags from the repository', async () => {
    tagRepository.findAll.mockResolvedValue(tags);

    const result = await useCase.execute();

    expect(tagRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(tags);
    expect(result).toHaveLength(2);
  });

  // Empty catalog should still be returned as an empty list
  it('should return an empty array when there are no tags', async () => {
    tagRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
