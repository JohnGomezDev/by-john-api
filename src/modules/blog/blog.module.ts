import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCreateCategoryUseCase } from './application/use-cases/admin-create-category/admin-create-category.use-case';
import { AdminCreatePostUseCase } from './application/use-cases/admin-create-post/admin-create-post.use-case';
import { AdminCreateTagUseCase } from './application/use-cases/admin-create-tag/admin-create-tag.use-case';
import { AdminDeleteCategoryUseCase } from './application/use-cases/admin-delete-category/admin-delete-category.use-case';
import { AdminDeletePostUseCase } from './application/use-cases/admin-delete-post/admin-delete-post.use-case';
import { AdminDeleteTagUseCase } from './application/use-cases/admin-delete-tag/admin-delete-tag.use-case';
import { AdminGetPostUseCase } from './application/use-cases/admin-get-post/admin-get-post.use-case';
import { AdminListPostsUseCase } from './application/use-cases/admin-list-posts/admin-list-posts.use-case';
import { AdminPublishPostUseCase } from './application/use-cases/admin-publish-post/admin-publish-post.use-case';
import { AdminUnpublishPostUseCase } from './application/use-cases/admin-unpublish-post/admin-unpublish-post.use-case';
import { AdminUpdateCategoryUseCase } from './application/use-cases/admin-update-category/admin-update-category.use-case';
import { AdminUpdatePostUseCase } from './application/use-cases/admin-update-post/admin-update-post.use-case';
import { AdminUpdateTagUseCase } from './application/use-cases/admin-update-tag/admin-update-tag.use-case';
import { GetPostBySlugUseCase } from './application/use-cases/get-post-by-slug/get-post-by-slug.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories/list-categories.use-case';
import { ListPostsUseCase } from './application/use-cases/list-posts/list-posts.use-case';
import { ListTagsUseCase } from './application/use-cases/list-tags/list-tags.use-case';
import { CATEGORY_REPOSITORY } from './domain/repositories/category.repository.interface';
import { POST_REPOSITORY } from './domain/repositories/post.repository.interface';
import { TAG_REPOSITORY } from './domain/repositories/tag.repository.interface';
import { AdminBlogController } from './infrastructure/http/admin-blog.controller';
import { AdminPostController } from './infrastructure/http/admin-post.controller';
import { BlogController } from './infrastructure/http/blog.controller';
import { CategoryRepositoryImpl } from './infrastructure/persistence/category.repository.impl';
import { PostRepositoryImpl } from './infrastructure/persistence/post.repository.impl';
import { TagRepositoryImpl } from './infrastructure/persistence/tag.repository.impl';
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
  controllers: [AdminPostController, AdminBlogController, BlogController],
  providers: [
    {
      provide: POST_REPOSITORY,
      useClass: PostRepositoryImpl,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepositoryImpl,
    },
    {
      provide: TAG_REPOSITORY,
      useClass: TagRepositoryImpl,
    },
    AdminCreatePostUseCase,
    AdminListPostsUseCase,
    ListPostsUseCase,
    GetPostBySlugUseCase,
    ListCategoriesUseCase,
    ListTagsUseCase,
    AdminGetPostUseCase,
    AdminUpdatePostUseCase,
    AdminDeletePostUseCase,
    AdminPublishPostUseCase,
    AdminUnpublishPostUseCase,
    AdminCreateCategoryUseCase,
    AdminUpdateCategoryUseCase,
    AdminDeleteCategoryUseCase,
    AdminCreateTagUseCase,
    AdminUpdateTagUseCase,
    AdminDeleteTagUseCase,
  ],
  exports: [TypeOrmModule, POST_REPOSITORY],
})
export class BlogModule {}
