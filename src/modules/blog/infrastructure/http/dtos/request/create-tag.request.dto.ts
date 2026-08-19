import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTagRequestDto {
  @ApiProperty({
    description: 'Nombre del tag',
    example: 'NestJS',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(255, { message: 'El nombre no puede superar 255 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Slug único del tag',
    example: 'nestjs',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El slug es requerido' })
  @MaxLength(255, { message: 'El slug no puede superar 255 caracteres' })
  slug: string;
}
