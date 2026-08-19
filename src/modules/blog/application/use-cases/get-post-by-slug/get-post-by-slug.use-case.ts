import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

@Injectable()
export class GetPostBySlugUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(slug: string): Promise<Post> {
    const post = await this.postRepository.findPublishedBySlug(slug);
    if (!post) {
      throw new NotFoundException(`Post con slug ${slug} no encontrado`);
    }
    return post;
  }
}
