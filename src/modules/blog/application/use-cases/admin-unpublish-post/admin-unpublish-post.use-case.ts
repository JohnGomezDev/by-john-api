import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Post } from '../../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

@Injectable()
export class AdminUnpublishPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(id: string, adminId: string): Promise<Post> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new NotFoundException(`Post con id ${id} no encontrado`);
    }

    if (!post.isOwnedBy(adminId)) {
      throw new ForbiddenException(
        'No tienes permiso para despublicar este post',
      );
    }

    const unpublished = post.unpublish();
    return this.postRepository.save(
      unpublished,
      post.tags.map((tag) => tag.id),
    );
  }
}
