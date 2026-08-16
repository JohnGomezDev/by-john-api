import { ApiProperty } from '@nestjs/swagger';
import type { Tag } from '../../../../domain/entities/tag.entity';

export class TagDto {
  @ApiProperty({ description: 'ID del tag', example: 'uuid-...' })
  id: string;

  @ApiProperty({ description: 'Nombre del tag', example: 'NestJS' })
  name: string;

  @ApiProperty({ description: 'Slug del tag', example: 'nestjs' })
  slug: string;

  static fromDomain(tag: Tag): TagDto {
    const dto = new TagDto();
    dto.id = tag.id;
    dto.name = tag.name;
    dto.slug = tag.slug;
    return dto;
  }
}
