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

  // publish should mark the post as published and set publishedAt
  it('should publish a complete post', () => {
    const draft = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    });

    const published = draft.publish();

    expect(published.published).toBe(true);
    expect(published.publishedAt).toEqual(fixedNow);
    expect(published.updatedAt).toEqual(fixedNow);
    expect(published.id).toBe(draft.id);
  });

  // publish should reject incomplete posts
  it('should throw when publishing an incomplete post', () => {
    const incomplete = new Post(
      fixedUuid,
      '',
      'slug',
      '',
      '',
      false,
      null,
      fixedNow,
      fixedNow,
      adminId,
      categoryId,
    );

    expect(() => incomplete.publish()).toThrow('No se puede publicar un post incompleto');
  });

  // unpublish should clear published state
  it('should unpublish a post', () => {
    const published = Post.create({
      title: 'Hello',
      slug: 'hello',
      content: 'Content',
      adminId,
      categoryId,
    }).publish();

    const draft = published.unpublish();

    expect(draft.published).toBe(false);
    expect(draft.publishedAt).toBeNull();
    expect(draft.id).toBe(published.id);
  });
});
