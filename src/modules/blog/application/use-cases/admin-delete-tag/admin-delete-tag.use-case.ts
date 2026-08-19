import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  TAG_REPOSITORY,
  type ITagRepository,
} from '../../../domain/repositories/tag.repository.interface';

@Injectable()
export class AdminDeleteTagUseCase {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(id: string): Promise<void> {
    try {
      const tag = await this.tagRepository.findById(id);
      if (!tag) {
        throw new NotFoundException(`Tag con id ${id} no encontrado`);
      }

      await this.tagRepository.delete(id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23503'
      ) {
        throw new ConflictException(
          'No se puede eliminar el tag porque está asociado a posts',
        );
      }
      throw error;
    }
  }
}
