import { ApiProperty, PickType } from '@nestjs/swagger';
import type { Category } from '../../../../domain/entities/category.entity';

export class CategoryDto {
  @ApiProperty({
    description: 'ID de la categoría',
    example: 'UUID...1234567890',
  })
  id: string;

  @ApiProperty({ description: 'Nombre de la categoría', example: 'Backend' })
  name: string;

  @ApiProperty({ description: 'Slug de la categoría', example: 'backend' })
  slug: string;

  static fromDomain(category: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.slug = category.slug;
    return dto;
  }
}

export class PublicCategoryDto extends PickType(CategoryDto, [
  'name',
  'slug',
] as const) {
  static fromDomain(category: Category): PublicCategoryDto {
    const dto = new PublicCategoryDto();
    dto.name = category.name;
    dto.slug = category.slug;
    return dto;
  }
}
