import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../../domain/repositories/category.repository.interface';

@Injectable()
export class AdminDeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  /**
   * Postgres rejects the delete with 23503 when posts still reference the
   * category (ON DELETE RESTRICT). That is mapped to a 409 instead of a 500.
   */
  async execute(id: string): Promise<void> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundException(`Categoría con id ${id} no encontrada`);
      }

      await this.categoryRepository.delete(id);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23503'
      ) {
        throw new ConflictException(
          'No se puede eliminar la categoría porque tiene posts asociados',
        );
      }
      throw error;
    }
  }
}
