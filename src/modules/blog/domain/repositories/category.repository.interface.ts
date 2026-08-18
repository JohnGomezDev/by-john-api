import type { Category } from '../entities/category.entity';

export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
}
