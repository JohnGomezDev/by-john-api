import {
  ConflictException,
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

export interface IAdminCreatePostDto {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  tagIds?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
}

@Injectable()
export class AdminCreatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(dto: IAdminCreatePostDto, adminId: string): Promise<Post> {
    try {
      const post = Post.create({
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        excerpt: dto.excerpt,
        adminId,
        categoryId: dto.categoryId,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImageUrl: dto.ogImageUrl,
      });

      return await this.postRepository.save(post, dto.tagIds ?? []);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error as unknown as { code?: string }).code;
        if (code === '23505') {
          throw new ConflictException(
            `El post con el slug ${dto.slug} ya existe`,
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
