import { ApiProperty } from '@nestjs/swagger';
import type { IAskBlogResult } from '../../../../application/use-cases/ask-blog/ask-blog.use-case';

export class PostSourceDto {
  @ApiProperty({
    description: 'Título del post fuente',
    example: 'Autenticación JWT en NestJS',
  })
  title: string;

  @ApiProperty({
    description: 'Slug del post fuente',
    example: 'autenticacion-jwt-en-nestjs',
  })
  slug: string;
}

export class AskBlogResponseDto {
  @ApiProperty({
    description: 'Respuesta generada por el asistente',
    example:
      'Según el post [1], la autenticación JWT en NestJS se implementa con Passport...',
  })
  answer: string;

  @ApiProperty({
    description: 'Posts del blog usados como contexto',
    type: [PostSourceDto],
  })
  sources: PostSourceDto[];

  static fromDomain(result: IAskBlogResult): AskBlogResponseDto {
    const dto = new AskBlogResponseDto();
    dto.answer = result.answer;
    dto.sources = result.sources.map((source) => {
      const item = new PostSourceDto();
      item.title = source.title;
      item.slug = source.slug;
      return item;
    });
    return dto;
  }
}
