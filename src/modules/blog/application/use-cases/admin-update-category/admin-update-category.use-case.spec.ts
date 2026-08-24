import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import { AdminUpdateCategoryUseCase } from './admin-update-category.use-case';

interface IMockedCategoryRepository {
  findById: jest.Mock;
  save: jest.Mock;
}

describe('AdminUpdateCategoryUseCase', () => {
  let useCase: AdminUpdateCategoryUseCase;
  let categoryRepository: IMockedCategoryRepository;

  const categoryId = '44444444-4444-4444-4444-444444444444';

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  function buildCategory(): Category {
    return Category.create({ name: 'Backend', slug: 'backend' });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminUpdateCategoryUseCase,
        {
          provide: CATEGORY_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminUpdateCategoryUseCase);
    categoryRepository = module.get(CATEGORY_REPOSITORY);
  });

  // Existing category should be updated with the provided fields
  it('should update and save the category with provided fields', async () => {
    const category = buildCategory();
    categoryRepository.findById.mockResolvedValue(category);
    categoryRepository.save.mockImplementation((updated: Category) =>
      Promise.resolve(updated),
    );

    const result = await useCase.execute(categoryId, {
      name: 'Frontend',
      slug: 'frontend',
    });

    expect(categoryRepository.findById).toHaveBeenCalledWith(categoryId);
    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: category.id,
        name: 'Frontend',
        slug: 'frontend',
      }),
    );
    expect(result.name).toBe('Frontend');
    expect(result.slug).toBe('frontend');
  });

  // Missing category should surface as NotFoundException
  it('should throw NotFoundException when the category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(categoryId, { name: 'Frontend' }),
    ).rejects.toThrow(
      new NotFoundException(`Categoría con id ${categoryId} no encontrada`),
    );
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  // Duplicate name or slug should surface as ConflictException
  it('should throw ConflictException when name or slug already exists', async () => {
    categoryRepository.findById.mockResolvedValue(buildCategory());
    categoryRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(
      useCase.execute(categoryId, { slug: 'duplicate-slug' }),
    ).rejects.toThrow(
      new ConflictException('Ya existe una categoría con ese nombre o slug'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    categoryRepository.findById.mockResolvedValue(buildCategory());
    categoryRepository.save.mockRejectedValue(unknownError);

    await expect(
      useCase.execute(categoryId, { name: 'Frontend' }),
    ).rejects.toThrow(unknownError);
  });
});
