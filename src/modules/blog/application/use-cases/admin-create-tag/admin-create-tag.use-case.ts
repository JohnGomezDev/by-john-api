import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Tag } from '../../../domain/entities/tag.entity';
import {
  TAG_REPOSITORY,
  type ITagRepository,
} from '../../../domain/repositories/tag.repository.interface';

export interface IAdminCreateTagDto {
  name: string;
  slug: string;
}

@Injectable()
export class AdminCreateTagUseCase {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(dto: IAdminCreateTagDto): Promise<Tag> {
    try {
      const tag = Tag.create({
        name: dto.name,
        slug: dto.slug,
      });
      return await this.tagRepository.save(tag);
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
