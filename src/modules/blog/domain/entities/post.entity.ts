import { randomUUID } from 'node:crypto';
import type { Category } from './category.entity';
import type { Tag } from './tag.entity';

export interface IPostAdminSummary {
  id: string;
  name: string;
  lastName: string;
}

export class Post {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly slug: string,
    readonly content: string,
    readonly excerpt: string,
    readonly metaTitle: string | null,
    readonly metaDescription: string | null,
    readonly ogImageUrl: string | null,
    readonly published: boolean,
    readonly publishedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly adminId: string,
    readonly categoryId: string,
    readonly tags: Tag[] = [],
    readonly category: Category | null = null,
    readonly adminInfo: IPostAdminSummary | null = null,
  ) {}

  static create(props: {
    title: string;
    slug: string;
    content: string;
    adminId: string;
    categoryId: string;
    excerpt?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImageUrl?: string | null;
  }): Post {
    const now = new Date();
    return new Post(
      randomUUID(),
      props.title,
      props.slug,
      props.content,
      props.excerpt ?? Post.buildExcerpt(props.content),
      props.metaTitle ?? null,
      props.metaDescription ?? null,
      props.ogImageUrl ?? null,
      false,
      null,
      now,
      now,
      props.adminId,
      props.categoryId,
    );
  }

  isOwnedBy(adminId: string): boolean {
    return this.adminId === adminId;
  }

  /**
   * Idempotent: always ends as published.
   * Sets publishedAt only on the first publish; later calls leave it unchanged.
   */
  publish(): Post {
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
      this.metaTitle,
      this.metaDescription,
      this.ogImageUrl,
      true,
      this.publishedAt ?? now,
      this.createdAt,
      now,
      this.adminId,
      this.categoryId,
      this.tags,
      this.category,
      this.adminInfo,
    );
  }

  /**
   * Idempotent: always ends as unpublished.
   * Preserves publishedAt so the original publication date is never lost.
   */
  unpublish(): Post {
    return new Post(
      this.id,
      this.title,
      this.slug,
      this.content,
      this.excerpt,
      this.metaTitle,
      this.metaDescription,
      this.ogImageUrl,
      false,
      this.publishedAt,
      this.createdAt,
      new Date(),
      this.adminId,
      this.categoryId,
      this.tags,
      this.category,
      this.adminInfo,
    );
  }

  update(props: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    categoryId?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImageUrl?: string | null;
  }): Post {
    const content = props.content ?? this.content;
    return new Post(
      this.id,
      props.title ?? this.title,
      props.slug ?? this.slug,
      content,
      props.excerpt ??
        (props.content !== undefined
          ? Post.buildExcerpt(content)
          : this.excerpt),
      props.metaTitle !== undefined ? props.metaTitle : this.metaTitle,
      props.metaDescription !== undefined
        ? props.metaDescription
        : this.metaDescription,
      props.ogImageUrl !== undefined ? props.ogImageUrl : this.ogImageUrl,
      this.published,
      this.publishedAt,
      this.createdAt,
      new Date(),
      this.adminId,
      props.categoryId ?? this.categoryId,
      this.tags,
      props.categoryId !== undefined && props.categoryId !== this.categoryId
        ? null
        : this.category,
      this.adminInfo,
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
