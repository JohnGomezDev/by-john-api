import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  POST_CHUNK_REPOSITORY,
  type IPostChunkRepository,
} from '../../../domain/repositories/post-chunk.repository.interface';

@Injectable()
export class UnindexPostUseCase {
  private readonly logger = new Logger(UnindexPostUseCase.name);

  constructor(
    @Inject(POST_CHUNK_REPOSITORY)
    private readonly chunkRepository: IPostChunkRepository,
  ) {}

  async execute(postId: string): Promise<void> {
    try {
      await this.chunkRepository.deleteByPostId(postId);
    } catch (error) {
      this.logger.error(`Error al desindexar el post ${postId}`, error);
      throw error;
    }
  }
}
