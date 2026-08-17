import { Inject, Injectable } from '@nestjs/common';
import type { Pagination } from 'nestjs-typeorm-paginate';
import type { Post } from '../../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

export interface IListPostsDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(dto: IListPostsDto): Promise<Pagination<Post>> {
    return this.postRepository.findPublishedPaginated({
      page: dto.page ?? 1,
      limit: dto.limit ?? 10,
      search: dto.search,
      categoryId: dto.categoryId,
    });
  }
}
