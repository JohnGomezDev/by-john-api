import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Tag } from '../../../domain/entities/tag.entity';
import { TAG_REPOSITORY } from '../../../domain/repositories/tag.repository.interface';
import { AdminDeleteTagUseCase } from './admin-delete-tag.use-case';

interface IMockedTagRepository {
  findById: jest.Mock;
  delete: jest.Mock;
}

describe('AdminDeleteTagUseCase', () => {
  let useCase: AdminDeleteTagUseCase;
  let tagRepository: IMockedTagRepository;

  const tagId = '55555555-5555-5555-5555-555555555555';

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminDeleteTagUseCase,
        {
          provide: TAG_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminDeleteTagUseCase);
    tagRepository = module.get(TAG_REPOSITORY);
  });

  // Existing tag without posts should be deleted
  it('should delete the tag when it exists', async () => {
    const tag = Tag.create({ name: 'NestJS', slug: 'nestjs' });
    tagRepository.findById.mockResolvedValue(tag);
    tagRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(tagId);

    expect(tagRepository.findById).toHaveBeenCalledWith(tagId);
    expect(tagRepository.delete).toHaveBeenCalledWith(tagId);
  });

  // Missing tag should surface as NotFoundException
  it('should throw NotFoundException when the tag does not exist', async () => {
    tagRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(tagId)).rejects.toThrow(
      new NotFoundException(`Tag con id ${tagId} no encontrado`),
    );
    expect(tagRepository.delete).not.toHaveBeenCalled();
  });

  // FK restrict when posts exist should surface as ConflictException
  it('should throw ConflictException when the tag is associated with posts', async () => {
    tagRepository.findById.mockResolvedValue(
      Tag.create({ name: 'NestJS', slug: 'nestjs' }),
    );
    tagRepository.delete.mockRejectedValue(buildQueryFailedError('23503'));

    await expect(useCase.execute(tagId)).rejects.toThrow(
      new ConflictException(
        'No se puede eliminar el tag porque está asociado a posts',
      ),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    tagRepository.findById.mockResolvedValue(
      Tag.create({ name: 'NestJS', slug: 'nestjs' }),
    );
    tagRepository.delete.mockRejectedValue(unknownError);

    await expect(useCase.execute(tagId)).rejects.toThrow(unknownError);
  });
});
