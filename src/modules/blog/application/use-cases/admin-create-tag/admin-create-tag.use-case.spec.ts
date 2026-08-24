import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Tag } from '../../../domain/entities/tag.entity';
import { TAG_REPOSITORY } from '../../../domain/repositories/tag.repository.interface';
import { AdminCreateTagUseCase } from './admin-create-tag.use-case';

interface IMockedTagRepository {
  save: jest.Mock;
}

describe('AdminCreateTagUseCase', () => {
  let useCase: AdminCreateTagUseCase;
  let tagRepository: IMockedTagRepository;

  const createDto = {
    name: 'NestJS',
    slug: 'nestjs',
  };

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminCreateTagUseCase,
        {
          provide: TAG_REPOSITORY,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminCreateTagUseCase);
    tagRepository = module.get(TAG_REPOSITORY);
  });

  // A valid dto should persist the tag with the provided name and slug
  it('should create and save a tag', async () => {
    tagRepository.save.mockImplementation((tag: Tag) => Promise.resolve(tag));

    const result = await useCase.execute(createDto);

    expect(tagRepository.save).toHaveBeenCalledTimes(1);
    expect(tagRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'NestJS',
        slug: 'nestjs',
      }),
    );
    expect(result.name).toBe('NestJS');
    expect(result.slug).toBe('nestjs');
  });

  // Duplicate name or slug should surface as ConflictException
  it('should throw ConflictException when name or slug already exists', async () => {
    tagRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(useCase.execute(createDto)).rejects.toThrow(
      new ConflictException('Ya existe un tag con ese nombre o slug'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    tagRepository.save.mockRejectedValue(unknownError);

    await expect(useCase.execute(createDto)).rejects.toThrow(unknownError);
  });
});
