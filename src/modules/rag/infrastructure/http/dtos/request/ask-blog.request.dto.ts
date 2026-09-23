import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AskBlogRequestDto {
  @ApiProperty({
    description: 'Pregunta sobre el contenido del blog',
    example: '¿Cómo implementar autenticación JWT en NestJS?',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'La pregunta es requerida' })
  @MinLength(3, { message: 'La pregunta debe tener al menos 3 caracteres' })
  @MaxLength(500, {
    message: 'La pregunta no puede superar 500 caracteres',
  })
  query: string;
}
