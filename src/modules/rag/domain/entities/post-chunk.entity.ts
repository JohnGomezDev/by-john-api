import { randomUUID } from 'node:crypto';

export class PostChunk {
  constructor(
    readonly id: string,
    readonly postId: string,
    readonly chunkIndex: number,
    readonly content: string,
    readonly embedding: number[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    postId: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
  }): PostChunk {
    const now = new Date();
    return new PostChunk(
      randomUUID(),
      props.postId,
      props.chunkIndex,
      props.content,
      props.embedding,
      now,
      now,
    );
  }
}
