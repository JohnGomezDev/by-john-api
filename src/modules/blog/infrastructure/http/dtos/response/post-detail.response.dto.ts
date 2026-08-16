import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Post } from '../../../../domain/entities/post.entity';
import { AdminSummaryDto } from './admin-summary.dto';
import { CategoryDto } from './category.dto';
import { TagDto } from './tag.dto';

export class PostDetailResponseDto {
  @ApiProperty({ description: 'ID del post', example: 'uuid-...' })
  id: string;

  @ApiProperty({ description: 'Título del post', example: 'Mi primer post' })
  title: string;

  @ApiProperty({ description: 'Slug del post', example: 'mi-primer-post' })
  slug: string;

  @ApiProperty({ description: 'Contenido del post' })
  content: string;

  @ApiProperty({ description: 'Extracto del post' })
  excerpt: string;

  @ApiPropertyOptional({
    description: 'Meta título SEO',
    nullable: true,
  })
  metaTitle: string | null;

  @ApiPropertyOptional({
    description: 'Meta descripción SEO',
    nullable: true,
  })
  metaDescription: string | null;

  @ApiPropertyOptional({
    description: 'URL de la imagen Open Graph',
    nullable: true,
  })
  ogImageUrl: string | null;

  @ApiProperty({ description: 'Indica si el post está publicado' })
  published: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de la primera publicación',
    nullable: true,
  })
  publishedAt: Date | null;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

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

  @ApiProperty({ description: 'Tags del post', type: [TagDto] })
  tags: TagDto[];

  static fromDomain(post: Post): PostDetailResponseDto {
    const dto = new PostDetailResponseDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.slug = post.slug;
    dto.content = post.content;
    dto.excerpt = post.excerpt;
    dto.metaTitle = post.metaTitle;
    dto.metaDescription = post.metaDescription;
    dto.ogImageUrl = post.ogImageUrl;
    dto.published = post.published;
    dto.publishedAt = post.publishedAt;
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    dto.category = post.category
      ? CategoryDto.fromDomain(post.category)
      : null;
    dto.admin = post.adminInfo
      ? AdminSummaryDto.fromSummary(post.adminInfo)
      : null;
    dto.tags = post.tags.map(TagDto.fromDomain);
    return dto;
  }
}
