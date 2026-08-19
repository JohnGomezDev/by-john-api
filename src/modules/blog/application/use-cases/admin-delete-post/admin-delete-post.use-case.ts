import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

@Injectable()
export class AdminDeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(id: string, adminId: string): Promise<void> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new NotFoundException(`Post con id ${id} no encontrado`);
    }

    if (!post.isOwnedBy(adminId)) {
      throw new ForbiddenException('No tienes permiso para eliminar este post');
    }

    await this.postRepository.delete(id);
  }
}
