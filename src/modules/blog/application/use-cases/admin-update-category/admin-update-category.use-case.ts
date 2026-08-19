import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface';

export interface IAdminUpdateCategoryDto {
  name?: string;
  slug?: string;
}

@Injectable()
export class AdminUpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(id: string, dto: IAdminUpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundException(`Categoría con id ${id} no encontrada`);
      }

      const updated = category.update({
        name: dto.name,
        slug: dto.slug,
      });
      return await this.categoryRepository.save(updated);
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
