import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogModule } from '../blog/blog.module';
import { AskBlogUseCase } from './application/use-cases/ask-blog/ask-blog.use-case';
import { IndexPostUseCase } from './application/use-cases/index-post/index-post.use-case';
import { UnindexPostUseCase } from './application/use-cases/unindex-post/unindex-post.use-case';
import { POST_CHUNK_REPOSITORY } from './domain/repositories/post-chunk.repository.interface';
import { EmbeddingService } from './infrastructure/embedding/embedding.service';
import { PostIndexingListener } from './infrastructure/events/post-indexing.listener';
import { RagController } from './infrastructure/http/rag.controller';
import { GroqService } from './infrastructure/llm/groq.service';
import { PostChunkRepositoryImpl } from './infrastructure/persistence/post-chunk.repository.impl';
import { PostChunkTypeOrmEntity } from './infrastructure/persistence/typeorm/post-chunk.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostChunkTypeOrmEntity]), BlogModule],
  controllers: [RagController],
  providers: [
    {
      provide: POST_CHUNK_REPOSITORY,
      useClass: PostChunkRepositoryImpl,
    },
    IndexPostUseCase,
    UnindexPostUseCase,
    AskBlogUseCase,
    EmbeddingService,
    GroqService,
    PostIndexingListener,
  ],
})
export class RagModule {}
