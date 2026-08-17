import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Post } from '../../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

export interface IAdminUpdatePostDto {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  categoryId?: string;
  tagIds?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
}

@Injectable()
export class AdminUpdatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(
    id: string,
    dto: IAdminUpdatePostDto,
    adminId: string,
  ): Promise<Post> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new NotFoundException(`Post con id ${id} no encontrado`);
    }

    if (!post.isOwnedBy(adminId)) {
      throw new ForbiddenException(
        'No tienes permiso para editar este post',
      );
    }

    const updated = post.update({
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      excerpt: dto.excerpt,
      categoryId: dto.categoryId,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      ogImageUrl: dto.ogImageUrl,
    });

    const tagIds = dto.tagIds ?? post.tags.map((tag) => tag.id);

    try {
      return await this.postRepository.save(updated, tagIds);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error as unknown as { code?: string }).code;
        if (code === '23505') {
          throw new ConflictException(
            `El post con el slug ${dto.slug ?? updated.slug} ya existe`,
          );
        }
        if (code === '23503') {
          throw new NotFoundException('La categoría especificada no existe');
        }
      }
      throw error;
    }
  }
}
