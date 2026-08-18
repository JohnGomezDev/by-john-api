import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { GetPostBySlugUseCase } from '../../application/use-cases/get-post-by-slug/get-post-by-slug.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories/list-categories.use-case';
import { ListPostsUseCase } from '../../application/use-cases/list-posts/list-posts.use-case';
import { ListTagsUseCase } from '../../application/use-cases/list-tags/list-tags.use-case';
import { ListPublishedPostsRequestDto } from './dtos/request/list-published-posts.request.dto';
import { PaginatedPostListDto } from './dtos/response/paginated-post-list.response.dto';
import { PublicPostDetailResponseDto } from './dtos/response/post-detail.response.dto';
import { PostListItemResponseDto } from './dtos/response/post-list-item.response.dto';
import { CategoryDto } from './dtos/response/category.dto';
import { TagDto } from './dtos/response/tag.dto';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly getPostBySlugUseCase: GetPostBySlugUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly listTagsUseCase: ListTagsUseCase,
  ) {}

  @ApiOperation({
    summary: 'Listar posts publicados',
    description:
      'Retorna los posts publicados, paginados por fecha de publicación descendente. Soporta búsqueda full-text y filtro por slug de categoría. Endpoint público.',
  })
  @ApiOkResponse({
    description: 'Listado de posts obtenido exitosamente',
    type: PaginatedPostListDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
  @Get('posts')
  async listPosts(
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

  @ApiOperation({
    summary: 'Obtener un post por slug',
    description:
      'Retorna el detalle completo de un post publicado. Busca por slug, no por id. Endpoint público.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug del post',
    example: 'mi-primer-post',
  })
  @ApiOkResponse({
    description: 'Post obtenido exitosamente',
    type: PublicPostDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post no encontrado' })
  @Get('posts/:slug')
  async getPostBySlug(
    @Param('slug') slug: string,
  ): Promise<ApiResponseDto<PublicPostDetailResponseDto>> {
    const post = await this.getPostBySlugUseCase.execute(slug);
    return ApiResponseDto.ok(
      PublicPostDetailResponseDto.fromDomain(post),
      'Post obtenido exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Listar categorías',
    description:
      'Retorna todas las categorías del blog, ordenadas por nombre. Endpoint público.',
  })
  @ApiOkResponse({
    description: 'Listado de categorías obtenido exitosamente',
    type: [CategoryDto],
  })
  @Get('categories')
  async listCategories(): Promise<
    ApiResponseDto<CategoryDto[]>
  > {
    const categories = await this.listCategoriesUseCase.execute();
    return ApiResponseDto.ok(
      categories.map(CategoryDto.fromDomain),
      'Listado de categorías obtenido exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Listar tags',
    description:
      'Retorna todos los tags del blog, ordenados por nombre. Endpoint público.',
  })
  @ApiOkResponse({
    description: 'Listado de tags obtenido exitosamente',
    type: [TagDto],
  })
  @Get('tags')
  async listTags(): Promise<ApiResponseDto<TagDto[]>> {
    const tags = await this.listTagsUseCase.execute();
    return ApiResponseDto.ok(
      tags.map(TagDto.fromDomain),
      'Listado de tags obtenido exitosamente',
    );
  }
}
