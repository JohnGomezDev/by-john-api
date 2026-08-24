import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import { AdminDeleteCategoryUseCase } from './admin-delete-category.use-case';

interface IMockedCategoryRepository {
  findById: jest.Mock;
  delete: jest.Mock;
}

describe('AdminDeleteCategoryUseCase', () => {
  let useCase: AdminDeleteCategoryUseCase;
  let categoryRepository: IMockedCategoryRepository;

  const categoryId = '44444444-4444-4444-4444-444444444444';

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminDeleteCategoryUseCase,
        {
          provide: CATEGORY_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminDeleteCategoryUseCase);
    categoryRepository = module.get(CATEGORY_REPOSITORY);
  });

  // Existing category without posts should be deleted
  it('should delete the category when it exists', async () => {
    const category = Category.create({ name: 'Backend', slug: 'backend' });
    categoryRepository.findById.mockResolvedValue(category);
    categoryRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(categoryId);

    expect(categoryRepository.findById).toHaveBeenCalledWith(categoryId);
    expect(categoryRepository.delete).toHaveBeenCalledWith(categoryId);
  });

  // Missing category should surface as NotFoundException
  it('should throw NotFoundException when the category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(categoryId)).rejects.toThrow(
      new NotFoundException(`Categoría con id ${categoryId} no encontrada`),
    );
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  // FK restrict when posts exist should surface as ConflictException
  it('should throw ConflictException when the category has associated posts', async () => {
    categoryRepository.findById.mockResolvedValue(
      Category.create({ name: 'Backend', slug: 'backend' }),
    );
    categoryRepository.delete.mockRejectedValue(buildQueryFailedError('23503'));

    await expect(useCase.execute(categoryId)).rejects.toThrow(
      new ConflictException(
        'No se puede eliminar la categoría porque tiene posts asociados',
      ),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    categoryRepository.findById.mockResolvedValue(
      Category.create({ name: 'Backend', slug: 'backend' }),
    );
    categoryRepository.delete.mockRejectedValue(unknownError);

    await expect(useCase.execute(categoryId)).rejects.toThrow(unknownError);
  });
});
