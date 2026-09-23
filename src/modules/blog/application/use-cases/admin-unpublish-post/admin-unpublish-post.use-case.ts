import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private readonly eventEmitter: EventEmitter2,
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

    const wasPublished = post.published;
    const unpublished = post.unpublish();
    const savedPost = await this.postRepository.save(
      unpublished,
      post.tags.map((tag) => tag.id),
    );

    if (wasPublished) {
      this.eventEmitter.emit('post.unpublished', { postId: savedPost.id });
    }

    return savedPost;
  }
}
