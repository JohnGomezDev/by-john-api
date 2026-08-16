import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { AdminCreatePostUseCase } from '../../application/use-cases/admin-create-post/admin-create-post.use-case';
import { AdminListPostsUseCase } from '../../application/use-cases/admin-list-posts/admin-list-posts.use-case';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { ICurrentUser } from '../../../auth/infrastructure/passport/jwt.strategy';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CreatePostRequestDto } from './dtos/request/create-post.request.dto';
import { ListPostsRequestDto } from './dtos/request/list-posts.request.dto';
import { PaginatedPostListDto } from './dtos/response/paginated-post-list.response.dto';
import { PostDetailResponseDto } from './dtos/response/post-detail.response.dto';
import { PostListItemResponseDto } from './dtos/response/post-list-item.response.dto';

@ApiTags('Admin - Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/posts')
export class AdminPostController {
  constructor(
    private readonly adminCreatePostUseCase: AdminCreatePostUseCase,
    private readonly adminListPostsUseCase: AdminListPostsUseCase,
  ) {}

  @ApiOperation({
    summary: 'Crear un post',
    description:
      'Crea un post en borrador (sin publicar). El admin_id se toma del usuario autenticado.',
  })
  @ApiBody({ type: CreatePostRequestDto })
  @ApiCreatedResponse({
    description: 'Post creado exitosamente',
    type: PostDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug ya existe' })
  @ApiNotFoundResponse({ description: 'La categoría especificada no existe' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() dto: CreatePostRequestDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<PostDetailResponseDto>> {
    const post = await this.adminCreatePostUseCase.execute(dto, user.id);
    return ApiResponseDto.ok(
      PostDetailResponseDto.fromDomain(post),
      'Post creado exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Listar posts del administrador',
    description:
      'Retorna los posts del usuario autenticado, paginados por fecha de publicación descendente. Soporta búsqueda full-text.',
  })
  @ApiOkResponse({
    description: 'Listado de posts obtenido exitosamente',
    type: PaginatedPostListDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de paginación inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get()
  async list(
    @Query() query: ListPostsRequestDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<Pagination<PostListItemResponseDto>>> {
    const result = await this.adminListPostsUseCase.execute(query, user.id);
    return ApiResponseDto.ok(
      {
        ...result,
        items: result.items.map(PostListItemResponseDto.fromDomain),
      },
      'Listado de posts obtenido exitosamente',
    );
  }
}
