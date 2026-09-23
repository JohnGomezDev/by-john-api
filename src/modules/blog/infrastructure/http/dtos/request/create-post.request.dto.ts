import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePostRequestDto {
  @ApiProperty({
    description: 'Título del post',
    example: 'Mi primer post',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @MaxLength(255, { message: 'El título no puede superar 255 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Slug único del post',
    example: 'mi-primer-post',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El slug es requerido' })
  @MaxLength(255, { message: 'El slug no puede superar 255 caracteres' })
  slug: string;

  @ApiProperty({
    description: 'Contenido del post en markdown',
    example: 'Contenido completo del artículo...',
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido es requerido' })
  content: string;

  @ApiProperty({
    description: 'Extracto del post',
    example: 'Resumen breve del artículo',
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty({ message: 'El extracto es requerido' })
  @MaxLength(160, { message: 'El extracto no puede superar 160 caracteres' })
  excerpt: string;

  @ApiProperty({
    description: 'ID de la categoría',
    example: '88888888-8888-8888-8888-888888888888',
  })
  @IsUUID('4', { message: 'El categoryId debe ser un UUID válido' })
  categoryId: string;

  @ApiPropertyOptional({
    description: 'IDs de los tags asociados',
    type: [String],
    example: ['55555555-5555-5555-5555-555555555555'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Cada tagId debe ser un UUID válido' })
  tagIds?: string[];

  @ApiPropertyOptional({
    description: 'Meta título SEO',
    example: 'Mi primer post | Portfolio',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: 'El metaTitle no puede superar 255 caracteres',
  })
  metaTitle?: string | null;

  @ApiPropertyOptional({
    description: 'Meta descripción SEO',
    example: 'Descripción corta para buscadores',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: 'El metaDescription no puede superar 255 caracteres',
  })
  metaDescription?: string | null;

  @ApiPropertyOptional({
    description: 'URL de la imagen Open Graph',
    example: 'https://example.com/og.png',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({}, { message: 'El ogImageUrl debe ser una URL válida' })
  @MaxLength(2048, {
    message: 'El ogImageUrl no puede superar 2048 caracteres',
  })
  ogImageUrl?: string | null;
}
