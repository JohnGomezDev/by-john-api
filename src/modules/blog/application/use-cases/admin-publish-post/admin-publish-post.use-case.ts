import {
  BadRequestException,
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
export class AdminPublishPostUseCase {
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
      throw new ForbiddenException('No tienes permiso para publicar este post');
    }

    const wasAlreadyPublished = post.published;

    try {
      const published = post.publish();
      const savedPost = await this.postRepository.save(
        published,
        post.tags.map((tag) => tag.id),
      );

      if (!wasAlreadyPublished) {
        this.eventEmitter.emit('post.published', { postId: savedPost.id });
      }

      return savedPost;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'No se puede publicar un post incompleto'
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
