import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  POST_CHUNK_REPOSITORY,
  type IHybridSearchResult,
  type IPostChunkRepository,
} from '../../../domain/repositories/post-chunk.repository.interface';
import { EmbeddingService } from '../../../infrastructure/embedding/embedding.service';
import { GroqService } from '../../../infrastructure/llm/groq.service';
import {
  RAG_NO_MATCH_ANSWER,
  RAG_SYSTEM_PROMPT,
  RAG_TOP_K_DEFAULT,
} from '../../constants/ask-blog.constants';

export interface IAskBlogSource {
  title: string;
  slug: string;
}

export interface IAskBlogResult {
  answer: string;
  sources: IAskBlogSource[];
}

@Injectable()
export class AskBlogUseCase {
  constructor(
    @Inject(POST_CHUNK_REPOSITORY)
    private readonly chunkRepository: IPostChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly groqService: GroqService,
    private readonly configService: ConfigService,
  ) {}

  async execute(query: string): Promise<IAskBlogResult> {
    const vector = await this.embeddingService.embedQuery(query);
    const topK = this.configService.get<number>(
      'RAG_TOP_K',
      RAG_TOP_K_DEFAULT,
    );
    const results = await this.chunkRepository.hybridSearch(
      vector,
      query,
      topK,
    );

    if (results.length === 0) {
      return {
        answer: RAG_NO_MATCH_ANSWER,
        sources: [],
      };
    }

    const context = results
      .map(
        (result, index) =>
          `[${index + 1}] ${result.postTitle}\n${result.content}`,
      )
      .join('\n\n');

    const answer = await this.groqService.generateAnswer(
      RAG_SYSTEM_PROMPT,
      `Pregunta: ${query}\n\nContexto:\n${context}`,
    );

    return {
      answer,
      sources: this.deduplicateSources(results),
    };
  }

  private deduplicateSources(
    results: IHybridSearchResult[],
  ): IAskBlogSource[] {
    const seen = new Set<string>();
    const sources: IAskBlogSource[] = [];

    for (const result of results) {
      if (seen.has(result.postId)) {
        continue;
      }
      seen.add(result.postId);
      sources.push({
        title: result.postTitle,
        slug: result.postSlug,
      });
    }

    return sources;
  }
}
