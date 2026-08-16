import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCreatePostUseCase } from './application/use-cases/admin-create-post/admin-create-post.use-case';
import { POST_REPOSITORY } from './domain/repositories/post.repository.interface';
import { AdminPostController } from './infrastructure/http/admin-post.controller';
import { PostRepositoryImpl } from './infrastructure/persistence/post.repository.impl';
import { CategoryTypeOrmEntity } from './infrastructure/persistence/typeorm/category.typeorm-entity';
import { PostTypeOrmEntity } from './infrastructure/persistence/typeorm/post.typeorm-entity';
import { TagTypeOrmEntity } from './infrastructure/persistence/typeorm/tag.typeorm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostTypeOrmEntity,
      CategoryTypeOrmEntity,
      TagTypeOrmEntity,
    ]),
  ],
  controllers: [AdminPostController],
  providers: [
    {
      provide: POST_REPOSITORY,
      useClass: PostRepositoryImpl,
    },
    AdminCreatePostUseCase,
  ],
  exports: [TypeOrmModule, POST_REPOSITORY],
})
export class BlogModule {}
