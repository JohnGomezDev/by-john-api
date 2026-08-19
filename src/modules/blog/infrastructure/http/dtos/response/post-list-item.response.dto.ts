import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Post } from '../../../../domain/entities/post.entity';
import { AdminSummaryDto } from './admin-summary.dto';
import { CategoryDto } from './category.dto';

export class PostListItemResponseDto {
  @ApiProperty({ description: 'ID del post', example: 'uuid-...' })
  id: string;

  @ApiProperty({ description: 'Título del post', example: 'Mi primer post' })
  title: string;

  @ApiProperty({ description: 'Slug del post', example: 'mi-primer-post' })
  slug: string;

  @ApiProperty({ description: 'Extracto del post' })
  excerpt: string;

  @ApiProperty({ description: 'Indica si el post está publicado' })
  published: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de la primera publicación',
    nullable: true,
  })
  publishedAt: Date | null;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Categoría del post',
    type: CategoryDto,
    nullable: true,
  })
  category: CategoryDto | null;

  @ApiPropertyOptional({
    description: 'Administrador autor del post',
    type: AdminSummaryDto,
    nullable: true,
  })
  admin: AdminSummaryDto | null;

  static fromDomain(post: Post): PostListItemResponseDto {
    const dto = new PostListItemResponseDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.slug = post.slug;
    dto.excerpt = post.excerpt;
    dto.published = post.published;
    dto.publishedAt = post.publishedAt;
    dto.updatedAt = post.updatedAt;
    dto.category = post.category ? CategoryDto.fromDomain(post.category) : null;
    dto.admin = post.adminInfo
      ? AdminSummaryDto.fromSummary(post.adminInfo)
      : null;
    return dto;
  }
}
