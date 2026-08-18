import { Inject, Injectable } from '@nestjs/common';
import type { Category } from '../../../domain/entities/category.entity';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(): Promise<Category[]> {
    return await this.categoryRepository.findAll();
  }
}
