import { randomUUID } from 'node:crypto';
import { Post } from './post.entity';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('Post', () => {
  const fixedUuid = '66666666-6666-6666-6666-666666666666';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const adminId = '77777777-7777-7777-7777-777777777777';
  const categoryId = '88888888-8888-8888-8888-888888888888';

  beforeEach(() => {
    (randomUUID as jest.Mock).mockReturnValue(fixedUuid);
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create an unpublished post with generated excerpt
  it('should create an unpublished post with generated excerpt', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Short content',
      adminId,
      categoryId,
    });

    expect(post).toEqual(
      expect.objectContaining({
        id: fixedUuid,
        title: 'Hello',
        slug: 'hello',
        content: 'Short content',
        excerpt: 'Short content',
        metaTitle: null,
        metaDescription: null,
        ogImageUrl: null,
        published: false,
        publishedAt: null,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        adminId,
        categoryId,
      }),
    );
  });

  // Factory should truncate excerpt to 160 characters when content is longer
  it('should truncate excerpt to 160 characters', () => {
    const content = 'a'.repeat(200);

    const post = Post.create({
      title: 'Long',
      slug: 'long',
      content,
      adminId,
      categoryId,
    });

    expect(post.excerpt).toHaveLength(160);
    expect(post.excerpt).toBe('a'.repeat(160));
  });

  // Factory should use provided excerpt when given
  it('should use provided excerpt when given', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Full markdown content',
      excerpt: 'Custom excerpt',
      adminId,
      categoryId,
    });

    expect(post.excerpt).toBe('Custom excerpt');
  });

  // Factory should persist optional SEO metadata when provided
  it('should create a post with SEO metadata', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
      metaTitle: 'SEO Title',
      metaDescription: 'SEO Description',
      ogImageUrl: 'https://example.com/og.png',
    });

    expect(post.metaTitle).toBe('SEO Title');
    expect(post.metaDescription).toBe('SEO Description');
    expect(post.ogImageUrl).toBe('https://example.com/og.png');
  });

  // publish should mark the post as published and set publishedAt
  it('should publish a complete post', () => {
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
      metaTitle: 'SEO Title',
      metaDescription: 'SEO Description',
      ogImageUrl: 'https://example.com/og.png',
    });

    const published = draft.publish();

    expect(published.published).toBe(true);
    expect(published.publishedAt).toEqual(fixedNow);
    expect(published.updatedAt).toEqual(fixedNow);
    expect(published.id).toBe(draft.id);
    expect(published.metaTitle).toBe('SEO Title');
    expect(published.metaDescription).toBe('SEO Description');
    expect(published.ogImageUrl).toBe('https://example.com/og.png');
  });

  // publish is idempotent: already published posts keep the original publishedAt
  it('should keep publishedAt when re-publishing an already published post', () => {
    const firstPublishedAt = new Date('2026-01-10T10:00:00.000Z');
    const published = new Post(
      fixedUuid,
      'Hello',
      'hello',
      'Content',
      'Content',
      null,
      null,
      null,
      true,
      firstPublishedAt,
      fixedNow,
      fixedNow,
      adminId,
      categoryId,
    );

    const later = new Date('2026-01-20T10:00:00.000Z');
    jest.setSystemTime(later);

    const result = published.publish();

    expect(result.published).toBe(true);
    expect(result.publishedAt).toEqual(firstPublishedAt);
    expect(result.updatedAt).toEqual(later);
  });

  // publish should reject incomplete posts
  it('should throw when publishing an incomplete post', () => {
    const incomplete = new Post(
      fixedUuid,
      '',
      'slug',
      '',
      '',
      null,
      null,
      null,
      false,
      null,
      fixedNow,
      fixedNow,
      adminId,
      categoryId,
    );

    expect(() => incomplete.publish()).toThrow(
      'No se puede publicar un post incompleto',
    );
  });

  // unpublish should clear published flag but preserve publishedAt
  it('should unpublish a post without clearing publishedAt', () => {
    const published = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    }).publish();

    const draft = published.unpublish();

    expect(draft.published).toBe(false);
    expect(draft.publishedAt).toEqual(fixedNow);
    expect(draft.id).toBe(published.id);
  });

  // unpublish is idempotent: already draft posts stay draft
  it('should remain draft when unpublishing an already draft post', () => {
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });

    const result = draft.unpublish();

    expect(result.published).toBe(false);
    expect(result.publishedAt).toBeNull();
  });

  // update should replace provided fields and bump updatedAt
  it('should update provided fields and bump updatedAt', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });

    const later = new Date('2026-01-20T10:00:00.000Z');
    jest.setSystemTime(later);

    const updated = post.update({
      title: 'Updated',
      slug: 'updated',
    });

    expect(updated.title).toBe('Updated');
    expect(updated.slug).toBe('updated');
    expect(updated.content).toBe('Content');
    expect(updated.updatedAt).toEqual(later);
    expect(updated.published).toBe(false);
    expect(updated.publishedAt).toBeNull();
  });

  // isOwnedBy should return true when the admin id matches the owner
  it('should report owned when adminId matches', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });

    expect(post.isOwnedBy(adminId)).toBe(true);
  });

  // isOwnedBy should return false when the admin id does not match the owner
  it('should report not owned when adminId does not match', () => {
    const post = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });

    expect(post.isOwnedBy('99999999-9999-9999-9999-999999999999')).toBe(false);
  });
});
