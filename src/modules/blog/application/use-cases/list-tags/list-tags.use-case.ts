import { Inject, Injectable } from '@nestjs/common';
import type { Tag } from '../../../domain/entities/tag.entity';
import {
  TAG_REPOSITORY,
  type ITagRepository,
} from '../../../domain/repositories/tag.repository.interface';

@Injectable()
export class ListTagsUseCase {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(): Promise<Tag[]> {
    return await this.tagRepository.findAll();
  }
}
