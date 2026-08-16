import { Inject, Injectable } from '@nestjs/common';
import type { Pagination } from 'nestjs-typeorm-paginate';
import type { Post } from '../../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../domain/repositories/post.repository.interface';

export interface IAdminListPostsDto {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class AdminListPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async execute(
    dto: IAdminListPostsDto,
    adminId: string,
  ): Promise<Pagination<Post>> {
    return this.postRepository.findPaginated(adminId, {
      page: dto.page ?? 1,
      limit: dto.limit ?? 10,
      search: dto.search,
    });
  }
}
