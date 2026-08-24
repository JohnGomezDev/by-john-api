import { Test } from '@nestjs/testing';
import { Category } from '../../../domain/entities/category.entity';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import { ListCategoriesUseCase } from './list-categories.use-case';

interface IMockedCategoryRepository {
  findAll: jest.Mock;
}

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let categoryRepository: IMockedCategoryRepository;

  const categories = [
    Category.create({ name: 'Backend', slug: 'backend' }),
    Category.create({ name: 'Frontend', slug: 'frontend' }),
  ];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListCategoriesUseCase,
        {
          provide: CATEGORY_REPOSITORY,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ListCategoriesUseCase);
    categoryRepository = module.get(CATEGORY_REPOSITORY);
  });

  // Repository result should be returned unchanged
  it('should return the categories from the repository', async () => {
    categoryRepository.findAll.mockResolvedValue(categories);

    const result = await useCase.execute();

    expect(categoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(categories);
    expect(result).toHaveLength(2);
  });

  // Empty catalog should still be returned as an empty list
  it('should return an empty array when there are no categories', async () => {
    categoryRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
