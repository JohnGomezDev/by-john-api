import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import type { Post } from '../../../../domain/entities/post.entity';
import { AdminSummaryDto } from './admin-summary.dto';
import { CategoryDto, PublicCategoryDto } from './category.dto';
import { PublicTagDto, TagDto } from './tag.dto';

function mapPostDetailBase(post: Post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    ogImageUrl: post.ogImageUrl,
    published: post.published,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    admin: post.adminInfo ? AdminSummaryDto.fromSummary(post.adminInfo) : null,
  };
}

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
    Object.assign(dto, mapPostDetailBase(post));
    dto.category = post.category ? CategoryDto.fromDomain(post.category) : null;
    dto.tags = post.tags.map((tag) => TagDto.fromDomain(tag));
    return dto;
  }
}

export class PublicPostDetailResponseDto extends OmitType(
  PostDetailResponseDto,
  ['category', 'tags'] as const,
) {
  @ApiPropertyOptional({
    description: 'Categoría del post',
    type: PublicCategoryDto,
    nullable: true,
  })
  category: PublicCategoryDto | null;

  @ApiProperty({ description: 'Tags del post', type: [PublicTagDto] })
  tags: PublicTagDto[];

  static fromDomain(post: Post): PublicPostDetailResponseDto {
    const dto = new PublicPostDetailResponseDto();
    Object.assign(dto, mapPostDetailBase(post));
    dto.category = post.category
      ? PublicCategoryDto.fromDomain(post.category)
      : null;
    dto.tags = post.tags.map((tag) => PublicTagDto.fromDomain(tag));
    return dto;
  }
}
