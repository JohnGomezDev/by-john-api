jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  POST_CHUNK_REPOSITORY,
  type IHybridSearchResult,
  type IPostChunkRepository,
} from '../../../domain/repositories/post-chunk.repository.interface';
import { EmbeddingService } from '../../../infrastructure/embedding/embedding.service';
import { GroqService } from '../../../infrastructure/llm/groq.service';
import { RAG_NO_MATCH_ANSWER } from '../../constants/ask-blog.constants';
import { AskBlogUseCase } from './ask-blog.use-case';

describe('AskBlogUseCase', () => {
  let useCase: AskBlogUseCase;
  let chunkRepository: jest.Mocked<Pick<IPostChunkRepository, 'hybridSearch'>>;
  let embeddingService: { embedQuery: jest.Mock };
  let groqService: { generateAnswer: jest.Mock };
  let configService: { get: jest.Mock };

  const query = '¿Cómo funciona JWT?';
  const queryVector = new Array(1024).fill(0.1);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AskBlogUseCase,
        {
          provide: POST_CHUNK_REPOSITORY,
          useValue: {
            hybridSearch: jest.fn(),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            embedQuery: jest.fn().mockResolvedValue(queryVector),
          },
        },
        {
          provide: GroqService,
          useValue: {
            generateAnswer: jest
              .fn()
              .mockResolvedValue('Esta es la respuesta'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(5),
          },
        },
      ],
    }).compile();

    useCase = module.get(AskBlogUseCase);
    chunkRepository = module.get(POST_CHUNK_REPOSITORY);
    embeddingService = module.get(EmbeddingService);
    groqService = module.get(GroqService);
    configService = module.get(ConfigService);
  });

  function buildSearchResult(
    overrides: Partial<IHybridSearchResult> = {},
  ): IHybridSearchResult {
    return {
      chunkId: 'chunk-1',
      postId: 'post-1',
      content: 'Contenido del chunk',
      rrfScore: 0.02,
      postTitle: 'Título del post',
      postSlug: 'titulo-del-post',
      ...overrides,
    };
  }

  // Happy path: embed, search, call LLM, and return answer with sources
  it('should embed the query with instruction prefix, search, call LLM, and return answer with sources', async () => {
    chunkRepository.hybridSearch.mockResolvedValue([
      buildSearchResult({
        chunkId: 'chunk-1',
        postId: 'post-1',
        postTitle: 'Auth JWT',
        postSlug: 'auth-jwt',
      }),
      buildSearchResult({
        chunkId: 'chunk-2',
        postId: 'post-2',
        postTitle: 'NestJS Tips',
        postSlug: 'nestjs-tips',
      }),
    ]);

    const result = await useCase.execute(query);

    expect(embeddingService.embedQuery).toHaveBeenCalledWith(query);
    expect(chunkRepository.hybridSearch).toHaveBeenCalledWith(
      queryVector,
      query,
      5,
    );
    expect(configService.get).toHaveBeenCalledWith('RAG_TOP_K', 5);
    expect(groqService.generateAnswer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      answer: 'Esta es la respuesta',
      sources: [
        { title: 'Auth JWT', slug: 'auth-jwt' },
        { title: 'NestJS Tips', slug: 'nestjs-tips' },
      ],
    });
  });

  // Empty retrieval must return the predefined answer without calling the LLM
  it('should return predefined no-match answer and NOT call LLM when hybridSearch returns empty array', async () => {
    chunkRepository.hybridSearch.mockResolvedValue([]);

    const result = await useCase.execute(query);

    expect(groqService.generateAnswer).not.toHaveBeenCalled();
    expect(result.answer).toBe(RAG_NO_MATCH_ANSWER);
    expect(result.sources).toEqual([]);
  });

  // Groq ServiceUnavailableException must propagate unchanged
  it('should propagate ServiceUnavailableException from GroqService without wrapping it', async () => {
    const unavailable = new ServiceUnavailableException(
      'El servicio de IA no está disponible en este momento',
    );
    chunkRepository.hybridSearch.mockResolvedValue([buildSearchResult()]);
    groqService.generateAnswer.mockRejectedValue(unavailable);

    await expect(useCase.execute(query)).rejects.toThrow(unavailable);
  });
});
