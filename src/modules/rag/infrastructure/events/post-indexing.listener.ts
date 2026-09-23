import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IndexPostUseCase } from '../../application/use-cases/index-post/index-post.use-case';
import { UnindexPostUseCase } from '../../application/use-cases/unindex-post/unindex-post.use-case';

@Injectable()
export class PostIndexingListener {
  private readonly logger = new Logger(PostIndexingListener.name);

  constructor(
    private readonly indexPostUseCase: IndexPostUseCase,
    private readonly unindexPostUseCase: UnindexPostUseCase,
  ) {}

  @OnEvent('post.published')
  async onPostPublished(payload: { postId: string }): Promise<void> {
    try {
      await this.indexPostUseCase.execute(payload.postId);
    } catch (error) {
      this.logger.error(
        `Error al indexar el post publicado ${payload.postId}`,
        error,
      );
    }
  }

  @OnEvent('post.updated')
  async onPostUpdated(payload: { postId: string }): Promise<void> {
    try {
      await this.indexPostUseCase.execute(payload.postId);
    } catch (error) {
      this.logger.error(
        `Error al re-indexar el post actualizado ${payload.postId}`,
        error,
      );
    }
  }

  @OnEvent('post.unpublished')
  async onPostUnpublished(payload: { postId: string }): Promise<void> {
    try {
      await this.unindexPostUseCase.execute(payload.postId);
    } catch (error) {
      this.logger.error(
        `Error al desindexar el post despublicado ${payload.postId}`,
        error,
      );
    }
  }
}
