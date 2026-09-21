import { Inject, Injectable, Logger } from '@nestjs/common';
import removeMarkdown from 'remove-markdown';
import {
  POST_REPOSITORY,
  type IPostRepository,
} from '../../../../blog/domain/repositories/post.repository.interface';
import { PostChunk } from '../../../domain/entities/post-chunk.entity';
import {
  POST_CHUNK_REPOSITORY,
  type IPostChunkRepository,
} from '../../../domain/repositories/post-chunk.repository.interface';
import { EmbeddingService } from '../../../infrastructure/embedding/embedding.service';
import {
  CHUNK_MAX_CHARS,
  CHUNK_MIN_CHARS,
  CHUNK_OVERLAP_CHARS,
} from '../../constants/chunking.constants';

@Injectable()
export class IndexPostUseCase {
  private readonly logger = new Logger(IndexPostUseCase.name);

  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
    @Inject(POST_CHUNK_REPOSITORY)
    private readonly chunkRepository: IPostChunkRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async execute(postId: string): Promise<void> {
    try {
      const post = await this.postRepository.findById(postId);
      if (!post) {
        this.logger.warn(
          `No se indexó el post ${postId}: no existe en la base de datos`,
        );
        return;
      }

      const plainText = removeMarkdown(post.content);
      const textChunks = this.chunkText(plainText);

      const chunks: PostChunk[] = [];
      for (const [chunkIndex, content] of textChunks.entries()) {
        const embedding = await this.embeddingService.embedDocument(content);
        chunks.push(
          PostChunk.create({
            postId,
            chunkIndex,
            content,
            embedding,
          }),
        );
      }

      await this.chunkRepository.replaceForPost(postId, chunks);
    } catch (error) {
      this.logger.error(`Error al indexar el post ${postId}`, error);
      throw error;
    }
  }

  /**
   * Splits plain text into overlapping chunks sized for embedding.
   * Merges short paragraphs up to CHUNK_MIN_CHARS, caps at CHUNK_MAX_CHARS,
   * and prefixes each subsequent chunk with CHUNK_OVERLAP_CHARS of the previous one.
   */
  private chunkText(text: string): string[] {
    const paragraphs = text
      .split(/\n\n+/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);

    if (paragraphs.length === 0) {
      const trimmed = text.trim();
      return trimmed.length > 0 ? [trimmed] : [];
    }

    const rawChunks: string[] = [];
    let buffer = '';

    for (const paragraph of paragraphs) {
      const candidate = buffer.length > 0 ? `${buffer}\n\n${paragraph}` : paragraph;

      if (candidate.length <= CHUNK_MAX_CHARS) {
        buffer = candidate;
        continue;
      }

      if (buffer.length > 0) {
        rawChunks.push(...this.splitOversized(buffer));
      }

      if (paragraph.length <= CHUNK_MAX_CHARS) {
        buffer = paragraph;
      } else {
        rawChunks.push(...this.splitOversized(paragraph));
        buffer = '';
      }
    }

    if (buffer.length > 0) {
      if (buffer.length < CHUNK_MIN_CHARS && rawChunks.length > 0) {
        const previous = rawChunks.pop()!;
        const merged = `${previous}\n\n${buffer}`;
        rawChunks.push(...this.splitOversized(merged));
      } else {
        rawChunks.push(...this.splitOversized(buffer));
      }
    }

    return this.applyOverlap(rawChunks);
  }

  private splitOversized(text: string): string[] {
    if (text.length <= CHUNK_MAX_CHARS) {
      return [text];
    }

    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > CHUNK_MAX_CHARS) {
      const window = remaining.slice(0, CHUNK_MAX_CHARS);
      const breakAt = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('? '),
        window.lastIndexOf('! '),
        window.lastIndexOf('.\n'),
        window.lastIndexOf('?\n'),
        window.lastIndexOf('!\n'),
      );

      const cutIndex = breakAt > CHUNK_MIN_CHARS ? breakAt + 1 : CHUNK_MAX_CHARS;
      parts.push(remaining.slice(0, cutIndex).trim());
      remaining = remaining.slice(cutIndex).trim();
    }

    if (remaining.length > 0) {
      parts.push(remaining);
    }

    return parts;
  }

  private applyOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    return chunks.map((chunk, index) => {
      if (index === 0) {
        return chunk;
      }

      const previous = chunks[index - 1];
      const overlap = previous.slice(-CHUNK_OVERLAP_CHARS);
      return `${overlap}${chunk}`;
    });
  }
}
