import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { AdminCreatePostUseCase } from '../../application/use-cases/admin-create-post/admin-create-post.use-case';
import { CurrentUser } from '../../../auth/infrastructure/decorators/current-user.decorator';
import type { ICurrentUser } from '../../../auth/infrastructure/passport/jwt.strategy';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CreatePostRequestDto } from './dtos/request/create-post.request.dto';
import { PostDetailResponseDto } from './dtos/response/post-detail.response.dto';

@ApiTags('Admin - Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/posts')
export class AdminPostController {
  constructor(private readonly adminCreatePostUseCase: AdminCreatePostUseCase) {}

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
}
