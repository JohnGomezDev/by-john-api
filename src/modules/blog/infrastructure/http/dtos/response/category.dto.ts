import { ApiProperty } from '@nestjs/swagger';
import type { Category } from '../../../../domain/entities/category.entity';

export class CategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Backend' })
  name: string;

  @ApiProperty({ description: 'Slug de la categoría', example: 'backend' })
  slug: string;

  static fromDomain(category: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.name = category.name;
    dto.slug = category.slug;
    return dto;
  }
}
