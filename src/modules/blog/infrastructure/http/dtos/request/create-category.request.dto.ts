import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Backend',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(255, { message: 'El nombre no puede superar 255 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Slug único de la categoría',
    example: 'backend',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'El slug es requerido' })
  @MaxLength(255, { message: 'El slug no puede superar 255 caracteres' })
  slug: string;
}
