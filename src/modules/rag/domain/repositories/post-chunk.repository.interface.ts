import type { PostChunk } from '../entities/post-chunk.entity';

export const POST_CHUNK_REPOSITORY = 'POST_CHUNK_REPOSITORY';

export interface IHybridSearchResult {
  chunkId: string;
  postId: string;
  content: string;
  rrfScore: number;
  postTitle: string;
  postSlug: string;
}

export interface IPostChunkRepository {
  replaceForPost(postId: string, chunks: PostChunk[]): Promise<void>;
  deleteByPostId(postId: string): Promise<void>;
  hybridSearch(
    queryVector: number[],
    queryText: string,
    topK: number,
  ): Promise<IHybridSearchResult[]>;
}
