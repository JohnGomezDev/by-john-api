import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListPublishedPostsRequestDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El page debe ser un número entero' })
  @Min(1, { message: 'El page debe ser al menos 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El limit debe ser un número entero' })
  @Min(1, { message: 'El limit debe ser al menos 1' })
  @Max(50, { message: 'El limit no puede superar 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Palabras clave para búsqueda full-text',
    example: 'nestjs typescript',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría para filtrar los posts',
    example: '88888888-8888-8888-8888-888888888888',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El categoryId debe ser un UUID válido' })
  categoryId?: string;
}
