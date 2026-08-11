import { randomUUID } from 'node:crypto';

export class Post {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly slug: string,
    readonly content: string,
    readonly excerpt: string,
    readonly published: boolean,
    readonly publishedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly adminId: string,
    readonly categoryId: string,
  ) {}

  static create(props: {
    title: string;
    slug: string;
    content: string;
    adminId: string;
    categoryId: string;
    excerpt?: string;
  }): Post {
    const now = new Date();
    return new Post(
      randomUUID(),
      props.title,
      props.slug,
      props.content,
      props.excerpt ?? Post.buildExcerpt(props.content),
      false,
      null,
      now,
      now,
      props.adminId,
      props.categoryId,
    );
  }

  publish(): Post {
    if (this.published) {
      throw new Error('El post ya está publicado');
    }

    if (!this.title || !this.content) {
      throw new Error('No se puede publicar un post incompleto');
    }

    const now = new Date();
    return new Post(
      this.id,
      this.title,
      this.slug,
      this.content,
      this.excerpt,
      true,
      now,
      this.createdAt,
      now,
      this.adminId,
      this.categoryId,
    );
  }

  unpublish(): Post {
    if (!this.published) {
      throw new Error('El post ya está en borrador');
    }

    return new Post(
      this.id,
      this.title,
      this.slug,
      this.content,
      this.excerpt,
      false,
      null,
      this.createdAt,
      new Date(),
      this.adminId,
      this.categoryId,
    );
  }

  private static buildExcerpt(content: string): string {
    const normalized = content.trim();
    if (normalized.length <= 160) {
      return normalized;
    }
    return normalized.substring(0, 160);
  }
}
