import type { Tag } from '../entities/tag.entity';

export const TAG_REPOSITORY = 'TAG_REPOSITORY';

export interface ITagRepository {
  findAll(): Promise<Tag[]>;
}
