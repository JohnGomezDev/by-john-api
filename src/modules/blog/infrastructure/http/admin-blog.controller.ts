import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AdminCreateCategoryUseCase } from '../../application/use-cases/admin-create-category/admin-create-category.use-case';
import { AdminCreateTagUseCase } from '../../application/use-cases/admin-create-tag/admin-create-tag.use-case';
import { AdminDeleteCategoryUseCase } from '../../application/use-cases/admin-delete-category/admin-delete-category.use-case';
import { AdminDeleteTagUseCase } from '../../application/use-cases/admin-delete-tag/admin-delete-tag.use-case';
import { AdminUpdateCategoryUseCase } from '../../application/use-cases/admin-update-category/admin-update-category.use-case';
import { AdminUpdateTagUseCase } from '../../application/use-cases/admin-update-tag/admin-update-tag.use-case';
import { CreateCategoryRequestDto } from './dtos/request/create-category.request.dto';
import { CreateTagRequestDto } from './dtos/request/create-tag.request.dto';
import { UpdateCategoryRequestDto } from './dtos/request/update-category.request.dto';
import { UpdateTagRequestDto } from './dtos/request/update-tag.request.dto';
import { CategoryDto } from './dtos/response/category.dto';
import { TagDto } from './dtos/response/tag.dto';

@ApiTags('Admin - Blog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/blog')
export class AdminBlogController {
  constructor(
    private readonly adminCreateCategoryUseCase: AdminCreateCategoryUseCase,
    private readonly adminUpdateCategoryUseCase: AdminUpdateCategoryUseCase,
    private readonly adminDeleteCategoryUseCase: AdminDeleteCategoryUseCase,
    private readonly adminCreateTagUseCase: AdminCreateTagUseCase,
    private readonly adminUpdateTagUseCase: AdminUpdateTagUseCase,
    private readonly adminDeleteTagUseCase: AdminDeleteTagUseCase,
  ) {}

  @ApiOperation({
    summary: 'Crear una categoría',
    description: 'Crea una categoría del blog. El slug se envía en el body.',
  })
  @ApiBody({ type: CreateCategoryRequestDto })
  @ApiCreatedResponse({
    description: 'Categoría creada exitosamente',
    type: CategoryDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El nombre o slug ya existe' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.CREATED)
  @Post('categories')
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<ApiResponseDto<CategoryDto>> {
    const category = await this.adminCreateCategoryUseCase.execute(dto);
    return ApiResponseDto.ok(
      CategoryDto.fromDomain(category),
      'Categoría creada exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Editar una categoría',
    description:
      'Actualiza los campos enviados de una categoría. Solo se modifican los campos presentes en el body.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la categoría',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateCategoryRequestDto })
  @ApiOkResponse({
    description: 'Categoría actualizada exitosamente',
    type: CategoryDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El nombre o slug ya existe' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryRequestDto,
  ): Promise<ApiResponseDto<CategoryDto>> {
    const category = await this.adminUpdateCategoryUseCase.execute(id, dto);
    return ApiResponseDto.ok(
      CategoryDto.fromDomain(category),
      'Categoría actualizada exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Eliminar una categoría',
    description:
      'Elimina una categoría. Falla si hay posts asociados (FK RESTRICT).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la categoría',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Categoría eliminada exitosamente' })
  @ApiConflictResponse({
    description: 'La categoría tiene posts asociados',
  })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.OK)
  @Delete('categories/:id')
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.adminDeleteCategoryUseCase.execute(id);
    return ApiResponseDto.ok(null, 'Categoría eliminada exitosamente');
  }

  @ApiOperation({
    summary: 'Crear un tag',
    description: 'Crea un tag del blog. El slug se envía en el body.',
  })
  @ApiBody({ type: CreateTagRequestDto })
  @ApiCreatedResponse({
    description: 'Tag creado exitosamente',
    type: TagDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El nombre o slug ya existe' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.CREATED)
  @Post('tags')
  async createTag(
    @Body() dto: CreateTagRequestDto,
  ): Promise<ApiResponseDto<TagDto>> {
    const tag = await this.adminCreateTagUseCase.execute(dto);
    return ApiResponseDto.ok(TagDto.fromDomain(tag), 'Tag creado exitosamente');
  }

  @ApiOperation({
    summary: 'Editar un tag',
    description:
      'Actualiza los campos enviados de un tag. Solo se modifican los campos presentes en el body.',
  })
  @ApiParam({ name: 'id', description: 'UUID del tag', format: 'uuid' })
  @ApiBody({ type: UpdateTagRequestDto })
  @ApiOkResponse({
    description: 'Tag actualizado exitosamente',
    type: TagDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El nombre o slug ya existe' })
  @ApiNotFoundResponse({ description: 'Tag no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch('tags/:id')
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagRequestDto,
  ): Promise<ApiResponseDto<TagDto>> {
    const tag = await this.adminUpdateTagUseCase.execute(id, dto);
    return ApiResponseDto.ok(
      TagDto.fromDomain(tag),
      'Tag actualizado exitosamente',
    );
  }

  @ApiOperation({
    summary: 'Eliminar un tag',
    description:
      'Elimina un tag. Falla si está asociado a posts (FK NO ACTION).',
  })
  @ApiParam({ name: 'id', description: 'UUID del tag', format: 'uuid' })
  @ApiOkResponse({ description: 'Tag eliminado exitosamente' })
  @ApiConflictResponse({
    description: 'El tag está asociado a posts',
  })
  @ApiNotFoundResponse({ description: 'Tag no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @HttpCode(HttpStatus.OK)
  @Delete('tags/:id')
  async deleteTag(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.adminDeleteTagUseCase.execute(id);
    return ApiResponseDto.ok(null, 'Tag eliminado exitosamente');
  }
}
