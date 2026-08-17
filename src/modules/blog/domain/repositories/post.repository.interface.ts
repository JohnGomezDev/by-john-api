import type { Pagination } from 'nestjs-typeorm-paginate';
import type { Post } from '../entities/post.entity';

export const POST_REPOSITORY = 'POST_REPOSITORY';

export interface IPostPaginateOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface IPostPublishedPaginateOptions extends IPostPaginateOptions {
  categoryId?: string;
}

export interface IPostRepository {
  save(post: Post, tagIds: string[]): Promise<Post>;
  findById(id: string): Promise<Post | null>;
  delete(id: string): Promise<void>;
  findPaginated(
    adminId: string,
    options: IPostPaginateOptions,
  ): Promise<Pagination<Post>>;
  findPublishedPaginated(
    options: IPostPublishedPaginateOptions,
  ): Promise<Pagination<Post>>;
  findPublishedBySlug(slug: string): Promise<Post | null>;
}
