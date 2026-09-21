import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { AskBlogUseCase } from '../../application/use-cases/ask-blog/ask-blog.use-case';
import { AskBlogRequestDto } from './dtos/request/ask-blog.request.dto';
import { AskBlogResponseDto } from './dtos/response/ask-blog.response.dto';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  constructor(private readonly askBlogUseCase: AskBlogUseCase) {}

  @ApiOperation({
    summary: 'Consulta el asistente del blog',
    description:
      'Busca información en los posts publicados usando búsqueda semántica + full-text y genera una respuesta con IA. Endpoint público.',
  })
  @ApiBody({ type: AskBlogRequestDto })
  @ApiOkResponse({
    description: 'Respuesta generada exitosamente',
    type: AskBlogResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Query inválida' })
  @ApiServiceUnavailableResponse({
    description: 'Servicio de IA no disponible',
  })
  @Post('ask')
  async ask(
    @Body() dto: AskBlogRequestDto,
  ): Promise<ApiResponseDto<AskBlogResponseDto>> {
    const result = await this.askBlogUseCase.execute(dto.query);
    return ApiResponseDto.ok(
      AskBlogResponseDto.fromDomain(result),
      'Consulta procesada exitosamente',
    );
  }
}
