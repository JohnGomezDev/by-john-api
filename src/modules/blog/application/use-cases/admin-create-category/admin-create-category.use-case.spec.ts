import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import { AdminCreateCategoryUseCase } from './admin-create-category.use-case';

interface IMockedCategoryRepository {
  save: jest.Mock;
}

describe('AdminCreateCategoryUseCase', () => {
  let useCase: AdminCreateCategoryUseCase;
  let categoryRepository: IMockedCategoryRepository;

  const createDto = {
    name: 'Backend',
    slug: 'backend',
  };

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminCreateCategoryUseCase,
        {
          provide: CATEGORY_REPOSITORY,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminCreateCategoryUseCase);
    categoryRepository = module.get(CATEGORY_REPOSITORY);
  });

  // A valid dto should persist the category with the provided name and slug
  it('should create and save a category', async () => {
    categoryRepository.save.mockImplementation((category: Category) =>
      Promise.resolve(category),
    );

    const result = await useCase.execute(createDto);

    expect(categoryRepository.save).toHaveBeenCalledTimes(1);
    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Backend',
        slug: 'backend',
      }),
    );
    expect(result.name).toBe('Backend');
    expect(result.slug).toBe('backend');
  });

  // Duplicate name or slug should surface as ConflictException
  it('should throw ConflictException when name or slug already exists', async () => {
    categoryRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(useCase.execute(createDto)).rejects.toThrow(
      new ConflictException('Ya existe una categoría con ese nombre o slug'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    categoryRepository.save.mockRejectedValue(unknownError);

    await expect(useCase.execute(createDto)).rejects.toThrow(unknownError);
  });
});
