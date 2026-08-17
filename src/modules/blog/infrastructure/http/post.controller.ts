import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { ListPostsUseCase } from '../../application/use-cases/list-posts/list-posts.use-case';
import { ListPublishedPostsRequestDto } from './dtos/request/list-published-posts.request.dto';
import { PaginatedPostListDto } from './dtos/response/paginated-post-list.response.dto';
import { PostListItemResponseDto } from './dtos/response/post-list-item.response.dto';

@ApiTags('Blog')
@Controller('blog/posts')
export class PostController {
  constructor(private readonly listPostsUseCase: ListPostsUseCase) {}

  @ApiOperation({
    summary: 'Listar posts publicados',
    description:
      'Retorna los posts publicados, paginados por fecha de publicación descendente. Soporta búsqueda full-text y filtro por categoría. Endpoint público.',
  })
  @ApiOkResponse({
    description: 'Listado de posts obtenido exitosamente',
    type: PaginatedPostListDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
  @Get()
  async list(
    @Query() query: ListPublishedPostsRequestDto,
  ): Promise<ApiResponseDto<Pagination<PostListItemResponseDto>>> {
    const result = await this.listPostsUseCase.execute(query);
    return ApiResponseDto.ok(
      {
        ...result,
        items: result.items.map(PostListItemResponseDto.fromDomain),
      },
      'Listado de posts obtenido exitosamente',
    );
  }
}
