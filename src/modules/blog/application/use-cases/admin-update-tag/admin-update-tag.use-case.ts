import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Tag } from '../../../domain/entities/tag.entity';
import {
  TAG_REPOSITORY,
  type ITagRepository,
} from '../../../domain/repositories/tag.repository.interface';

export interface IAdminUpdateTagDto {
  name?: string;
  slug?: string;
}

@Injectable()
export class AdminUpdateTagUseCase {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(id: string, dto: IAdminUpdateTagDto): Promise<Tag> {
    try {
      const tag = await this.tagRepository.findById(id);
      if (!tag) {
        throw new NotFoundException(`Tag con id ${id} no encontrado`);
      }

      const updated = tag.update({
        name: dto.name,
        slug: dto.slug,
      });
      return await this.tagRepository.save(updated);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Ya existe un tag con ese nombre o slug');
      }
      throw error;
    }
  }
}
