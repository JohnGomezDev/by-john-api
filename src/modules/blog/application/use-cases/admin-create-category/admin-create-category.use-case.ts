import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface';

export interface IAdminCreateCategoryDto {
  name: string;
  slug: string;
}

@Injectable()
export class AdminCreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(dto: IAdminCreateCategoryDto): Promise<Category> {
    try {
      const category = Category.create({
        name: dto.name,
        slug: dto.slug,
      });
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Ya existe una categoría con ese nombre o slug',
        );
      }
      throw error;
    }
  }
}
