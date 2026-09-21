import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { PostChunk } from '../../domain/entities/post-chunk.entity';
import type {
  IHybridSearchResult,
  IPostChunkRepository,
} from '../../domain/repositories/post-chunk.repository.interface';
import { PostChunkTypeOrmEntity } from './typeorm/post-chunk.typeorm-entity';

interface IHybridSearchRow {
  chunk_id: string;
  post_id: string;
  content: string;
  rrf_score: string;
  title: string;
  slug: string;
}

const HYBRID_SEARCH_SQL = `
WITH
semantic AS (
  SELECT pc.id AS chunk_id, pc.post_id, pc.content,
    ROW_NUMBER() OVER (ORDER BY pc.embedding <=> $1::vector) AS rank
  FROM posts_chunks pc
  INNER JOIN posts p ON pc.post_id = p.id
  WHERE p.published = true
  ORDER BY pc.embedding <=> $1::vector
  LIMIT 50
),
fts AS (
  SELECT pc.id AS chunk_id, pc.post_id, pc.content,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('spanish', $2)) DESC
    ) AS rank
  FROM posts_chunks pc
  INNER JOIN posts p ON pc.post_id = p.id
  WHERE p.search_vector @@ plainto_tsquery('spanish', $2)
    AND p.published = true
  LIMIT 50
),
rrf AS (
  SELECT
    COALESCE(s.chunk_id, f.chunk_id) AS chunk_id,
    COALESCE(s.post_id, f.post_id) AS post_id,
    COALESCE(s.content, f.content) AS content,
    COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + f.rank), 0.0) AS rrf_score
  FROM semantic s
  FULL OUTER JOIN fts f ON s.chunk_id = f.chunk_id
)
SELECT r.chunk_id, r.post_id, r.content, r.rrf_score, p.title, p.slug
FROM rrf r
INNER JOIN posts p ON r.post_id = p.id
WHERE p.published = true
ORDER BY r.rrf_score DESC
LIMIT $3
`;

@Injectable()
export class PostChunkRepositoryImpl implements IPostChunkRepository {
  constructor(
    @InjectRepository(PostChunkTypeOrmEntity)
    private readonly ormRepo: Repository<PostChunkTypeOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async replaceForPost(postId: string, chunks: PostChunk[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PostChunkTypeOrmEntity, { postId });

      if (chunks.length === 0) {
        return;
      }

      await manager.save(
        PostChunkTypeOrmEntity,
        chunks.map((chunk) => this.toOrm(chunk)),
      );
    });
  }

  async deleteByPostId(postId: string): Promise<void> {
    await this.ormRepo.delete({ postId });
  }

  async hybridSearch(
    queryVector: number[],
    queryText: string,
    topK: number,
  ): Promise<IHybridSearchResult[]> {
    const rows = await this.dataSource.query<IHybridSearchRow[]>(
      HYBRID_SEARCH_SQL,
      [JSON.stringify(queryVector), queryText, topK],
    );

    return rows.map((row) => ({
      chunkId: row.chunk_id,
      postId: row.post_id,
      content: row.content,
      rrfScore: parseFloat(row.rrf_score),
      postTitle: row.title,
      postSlug: row.slug,
    }));
  }

  private toOrm(chunk: PostChunk): PostChunkTypeOrmEntity {
    const entity = new PostChunkTypeOrmEntity();
    entity.id = chunk.id;
    entity.postId = chunk.postId;
    entity.chunkIndex = chunk.chunkIndex;
    entity.content = chunk.content;
    entity.embedding = chunk.embedding;
    entity.createdAt = chunk.createdAt;
    entity.updatedAt = chunk.updatedAt;
    return entity;
  }
}
