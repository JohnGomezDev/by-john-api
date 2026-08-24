import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Tag } from '../../../domain/entities/tag.entity';
import { TAG_REPOSITORY } from '../../../domain/repositories/tag.repository.interface';
import { AdminUpdateTagUseCase } from './admin-update-tag.use-case';

interface IMockedTagRepository {
  findById: jest.Mock;
  save: jest.Mock;
}

describe('AdminUpdateTagUseCase', () => {
  let useCase: AdminUpdateTagUseCase;
  let tagRepository: IMockedTagRepository;

  const tagId = '55555555-5555-5555-5555-555555555555';

  function buildQueryFailedError(code: string): QueryFailedError {
    const error = new QueryFailedError('query', [], new Error('db error'));
    (error as unknown as { code: string }).code = code;
    return error;
  }

  function buildTag(): Tag {
    return Tag.create({ name: 'NestJS', slug: 'nestjs' });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminUpdateTagUseCase,
        {
          provide: TAG_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(AdminUpdateTagUseCase);
    tagRepository = module.get(TAG_REPOSITORY);
  });

  // Existing tag should be updated with the provided fields
  it('should update and save the tag with provided fields', async () => {
    const tag = buildTag();
    tagRepository.findById.mockResolvedValue(tag);
    tagRepository.save.mockImplementation((updated: Tag) =>
      Promise.resolve(updated),
    );

    const result = await useCase.execute(tagId, {
      name: 'TypeScript',
      slug: 'typescript',
    });

    expect(tagRepository.findById).toHaveBeenCalledWith(tagId);
    expect(tagRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: tag.id,
        name: 'TypeScript',
        slug: 'typescript',
      }),
    );
    expect(result.name).toBe('TypeScript');
    expect(result.slug).toBe('typescript');
  });

  // Missing tag should surface as NotFoundException
  it('should throw NotFoundException when the tag does not exist', async () => {
    tagRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(tagId, { name: 'TypeScript' }),
    ).rejects.toThrow(
      new NotFoundException(`Tag con id ${tagId} no encontrado`),
    );
    expect(tagRepository.save).not.toHaveBeenCalled();
  });

  // Duplicate name or slug should surface as ConflictException
  it('should throw ConflictException when name or slug already exists', async () => {
    tagRepository.findById.mockResolvedValue(buildTag());
    tagRepository.save.mockRejectedValue(buildQueryFailedError('23505'));

    await expect(
      useCase.execute(tagId, { slug: 'duplicate-slug' }),
    ).rejects.toThrow(
      new ConflictException('Ya existe un tag con ese nombre o slug'),
    );
  });

  // Unknown errors should be re-thrown as-is
  it('should re-throw unknown errors from the repository', async () => {
    const unknownError = new Error('unexpected failure');
    tagRepository.findById.mockResolvedValue(buildTag());
    tagRepository.save.mockRejectedValue(unknownError);

    await expect(
      useCase.execute(tagId, { name: 'TypeScript' }),
    ).rejects.toThrow(unknownError);
  });
});
