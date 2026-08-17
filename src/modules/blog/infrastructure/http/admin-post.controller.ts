import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Pagination } from 'nestjs-typeorm-paginate';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { AdminCreatePostUseCase } from '../../application/use-cases/admin-create-post/admin-create-post.use-case';
import { AdminDeletePostUseCase } from '../../application/use-cases/admin-delete-post/admin-delete-post.use-case';
import { AdminGetPostUseCase } from '../../application/use-cases/admin-get-post/admin-get-post.use-case';
import { AdminListPostsUseCase } from '../../application/use-cases/admin-list-posts/admin-list-posts.use-case';
import { AdminPublishPostUseCase } from '../../application/use-cases/admin-publish-post/admin-publish-post.use-case';
import { AdminUnpublishPostUseCase } from '../../application/use-cases/admin-unpublish-post/admin-unpublish-post.use-case';
import { AdminUpdatePostUseCase } from '../../application/use-cases/admin-update-post/admin-update-post.use-case';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { ICurrentUser } from '../../../auth/infrastructure/passport/jwt.strategy';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CreatePostRequestDto } from './dtos/request/create-post.request.dto';
import { ListPostsRequestDto } from './dtos/request/list-posts.request.dto';
import { UpdatePostRequestDto } from './dtos/request/update-post.request.dto';
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
    private readonly adminGetPostUseCase: AdminGetPostUseCase,
    private readonly adminUpdatePostUseCase: AdminUpdatePostUseCase,
    private readonly adminDeletePostUseCase: AdminDeletePostUseCase,
    private readonly adminPublishPostUseCase: AdminPublishPostUseCase,
    private readonly adminUnpublishPostUseCase: AdminUnpublishPostUseCase,
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

  @ApiOperation({
    summary: 'Obtener un post por id',
    description:
      'Retorna el detalle completo de un post del usuario autenticado, listo para edición. Busca por id, no por slug.',
  })
  @ApiParam({ name: 'id', description: 'UUID del post', format: 'uuid' })
  @ApiOkResponse({
    description: 'Post obtenido exitosamente',
    type: PostDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post no encontrado' })
  @ApiForbiddenResponse({ description: 'El post no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<PostDetailResponseDto>> {
    const post = await this.adminGetPostUseCase.execute(id, user.id);
    return ApiResponseDto.ok(
      PostDetailResponseDto.fromDomain(post),
      'Post obtenido exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Editar un post',
    description:
      'Actualiza los campos enviados de un post del usuario autenticado. Solo se modifican los campos presentes en el body.',
  })
  @ApiParam({ name: 'id', description: 'UUID del post', format: 'uuid' })
  @ApiBody({ type: UpdatePostRequestDto })
  @ApiOkResponse({
    description: 'Post actualizado exitosamente',
    type: PostDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug ya existe' })
  @ApiNotFoundResponse({
    description: 'Post no encontrado o categoría inexistente',
  })
  @ApiForbiddenResponse({ description: 'El post no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostRequestDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<PostDetailResponseDto>> {
    const post = await this.adminUpdatePostUseCase.execute(id, dto, user.id);
    return ApiResponseDto.ok(
      PostDetailResponseDto.fromDomain(post),
      'Post actualizado exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Eliminar un post',
    description:
      'Elimina un post del usuario autenticado y sus relaciones en post_tag por cascade.',
  })
  @ApiParam({ name: 'id', description: 'UUID del post', format: 'uuid' })
  @ApiOkResponse({ description: 'Post eliminado exitosamente' })
  @ApiNotFoundResponse({ description: 'Post no encontrado' })
  @ApiForbiddenResponse({ description: 'El post no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<null>> {
    await this.adminDeletePostUseCase.execute(id, user.id);
    return ApiResponseDto.ok(null, 'Post eliminado exitosamente');
  }

  @ApiOperation({
    summary: 'Publicar un post',
    description:
      'Publica un post de forma idempotente. La fecha de publicación solo se setea la primera vez.',
  })
  @ApiParam({ name: 'id', description: 'UUID del post', format: 'uuid' })
  @ApiOkResponse({
    description: 'Post publicado exitosamente',
    type: PostDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'El post está incompleto' })
  @ApiNotFoundResponse({ description: 'Post no encontrado' })
  @ApiForbiddenResponse({ description: 'El post no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<PostDetailResponseDto>> {
    const post = await this.adminPublishPostUseCase.execute(id, user.id);
    return ApiResponseDto.ok(
      PostDetailResponseDto.fromDomain(post),
      'Post publicado exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Despublicar un post',
    description:
      'Despublica un post de forma idempotente. Conserva la fecha de publicación original.',
  })
  @ApiParam({ name: 'id', description: 'UUID del post', format: 'uuid' })
  @ApiOkResponse({
    description: 'Post despublicado exitosamente',
    type: PostDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post no encontrado' })
  @ApiForbiddenResponse({ description: 'El post no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch(':id/unpublish')
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ApiResponseDto<PostDetailResponseDto>> {
    const post = await this.adminUnpublishPostUseCase.execute(id, user.id);
    return ApiResponseDto.ok(
      PostDetailResponseDto.fromDomain(post),
      'Post despublicado exitosamente',
    );
  }
}
