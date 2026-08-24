import type { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import {
  deleteAdminsByUsernames,
  deleteCategoriesBySlugPrefix,
  deletePostsBySlugPrefix,
  deleteTagsBySlugPrefix,
  insertPost,
  upsertAdmin,
  upsertCategory,
  upsertTag,
} from '../helpers/fixtures';
import {
  anyArray,
  body,
  containing,
  http,
  itemSlugs,
  stringContaining,
} from '../helpers/http.helper';

const OWNER = {
  username: 'e2e.public.owner',
  password: 'Owner123!',
  email: 'e2e.public.owner@email.com',
  name: 'Public',
  lastName: 'Owner',
};

const SLUG_PREFIX = 'e2e-public-';
const PUBLISHED_SLUG = `${SLUG_PREFIX}published`;
const OTHER_CATEGORY_SLUG = `${SLUG_PREFIX}frontend-post`;
const DRAFT_SLUG = `${SLUG_PREFIX}draft`;
const MISSING_SLUG = `${SLUG_PREFIX}missing`;
const SEARCH_TERM = 'e2efulltextunique';

describe('Public blog (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
    await cleanup();

    const owner = await upsertAdmin(app, OWNER);
    const backend = await upsertCategory(app, {
      name: 'E2E Public Backend',
      slug: `${SLUG_PREFIX}backend`,
    });
    const frontend = await upsertCategory(app, {
      name: 'E2E Public Frontend',
      slug: `${SLUG_PREFIX}frontend`,
    });
    const tag = await upsertTag(app, {
      name: 'E2E Public NestJS',
      slug: `${SLUG_PREFIX}nestjs`,
    });

    await insertPost(app, {
      title: `Published post ${SEARCH_TERM}`,
      slug: PUBLISHED_SLUG,
      content: `Contenido publicado con ${SEARCH_TERM} para búsqueda.`,
      published: true,
      publishedAt: new Date(),
      adminId: owner.id,
      categoryId: backend.id,
      tagIds: [tag.id],
    });
    await insertPost(app, {
      title: 'Frontend published post',
      slug: OTHER_CATEGORY_SLUG,
      content: 'Contenido de frontend.',
      published: true,
      publishedAt: new Date(Date.now() - 60_000),
      adminId: owner.id,
      categoryId: frontend.id,
    });
    await insertPost(app, {
      title: 'Draft post',
      slug: DRAFT_SLUG,
      content: 'Este borrador no debe aparecer en el listado público.',
      published: false,
      adminId: owner.id,
      categoryId: backend.id,
      tagIds: [tag.id],
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await deletePostsBySlugPrefix(app, SLUG_PREFIX);
    await deleteTagsBySlugPrefix(app, SLUG_PREFIX);
    await deleteCategoriesBySlugPrefix(app, SLUG_PREFIX);
    await deleteAdminsByUsernames(app, [OWNER.username]);
  }

  // Categories should include the e2e fixture
  it('GET /api/blog/categories should return the fixture category', async () => {
    const response = await http(app).get('/api/blog/categories');

    expect(response.status).toBe(200);
    expect(body(response).status).toBe('ok');
    expect(body(response).message).toBe(
      'Listado de categorías obtenido exitosamente',
    );
    expect(body(response).data).toEqual(
      expect.arrayContaining([
        containing({
          name: 'E2E Public Backend',
          slug: `${SLUG_PREFIX}backend`,
        }),
      ]),
    );
  });

  // Tags should include the e2e fixture
  it('GET /api/blog/tags should return the fixture tag', async () => {
    const response = await http(app).get('/api/blog/tags');

    expect(response.status).toBe(200);
    expect(body(response).status).toBe('ok');
    expect(body(response).message).toBe(
      'Listado de tags obtenido exitosamente',
    );
    expect(body(response).data).toEqual(
      expect.arrayContaining([
        containing({
          name: 'E2E Public NestJS',
          slug: `${SLUG_PREFIX}nestjs`,
        }),
      ]),
    );
  });

  // Public list should include published posts and hide drafts
  it('GET /api/blog/posts should list published posts and hide drafts', async () => {
    const response = await http(app).get('/api/blog/posts?limit=50');

    expect(response.status).toBe(200);
    expect(body(response).status).toBe('ok');
    expect(body(response).message).toBe(
      'Listado de posts obtenido exitosamente',
    );
    expect(body(response).data).toEqual(
      containing({
        items: anyArray,
        meta: containing({
          currentPage: 1,
          itemsPerPage: 50,
        }),
      }),
    );

    const slugs = itemSlugs(response);
    expect(slugs).toContain(PUBLISHED_SLUG);
    expect(slugs).toContain(OTHER_CATEGORY_SLUG);
    expect(slugs).not.toContain(DRAFT_SLUG);
  });

  // Pagination metadata should respect limit
  it('GET /api/blog/posts should paginate with limit 1', async () => {
    const response = await http(app).get('/api/blog/posts?page=1&limit=1');

    expect(response.status).toBe(200);
    expect(body<{ items: { id: string }[] }>(response).data.items).toHaveLength(
      1,
    );
    expect(
      body<{
        meta: { currentPage: number; itemsPerPage: number; itemCount: number };
      }>(response).data.meta,
    ).toEqual(
      containing({
        currentPage: 1,
        itemsPerPage: 1,
        itemCount: 1,
      }),
    );
  });

  // Category slug should filter the public list
  it('GET /api/blog/posts should filter by categorySlug', async () => {
    const response = await http(app).get(
      `/api/blog/posts?categorySlug=${SLUG_PREFIX}backend`,
    );

    expect(response.status).toBe(200);
    const slugs = itemSlugs(response);
    expect(slugs).toContain(PUBLISHED_SLUG);
    expect(slugs).not.toContain(OTHER_CATEGORY_SLUG);
    expect(slugs).not.toContain(DRAFT_SLUG);
  });

  // Full-text search should match the published fixture
  it('GET /api/blog/posts should filter by search term', async () => {
    const response = await http(app).get(
      `/api/blog/posts?search=${SEARCH_TERM}`,
    );

    expect(response.status).toBe(200);
    const slugs = itemSlugs(response);
    expect(slugs).toContain(PUBLISHED_SLUG);
    expect(slugs).not.toContain(OTHER_CATEGORY_SLUG);
  });

  // Page below 1 should be rejected
  it('GET /api/blog/posts should return 400 when page is 0', async () => {
    const response = await http(app).get('/api/blog/posts?page=0');

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El page debe ser al menos 1']),
    );
  });

  // Limit above 50 should be rejected
  it('GET /api/blog/posts should return 400 when limit is 51', async () => {
    const response = await http(app).get('/api/blog/posts?limit=51');

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El limit no puede superar 50']),
    );
  });

  // Published slug should return public detail
  it('GET /api/blog/posts/:slug should return a published post', async () => {
    const response = await http(app).get(`/api/blog/posts/${PUBLISHED_SLUG}`);

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Post obtenido exitosamente',
      data: containing({
        slug: PUBLISHED_SLUG,
        title: `Published post ${SEARCH_TERM}`,
        content: stringContaining(SEARCH_TERM),
        published: true,
        category: {
          name: 'E2E Public Backend',
          slug: `${SLUG_PREFIX}backend`,
        },
        tags: [
          {
            name: 'E2E Public NestJS',
            slug: `${SLUG_PREFIX}nestjs`,
          },
        ],
      }),
    });
  });

  // Draft slug should be hidden from the public API
  it('GET /api/blog/posts/:slug should return 404 for a draft', async () => {
    const response = await http(app).get(`/api/blog/posts/${DRAFT_SLUG}`);

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con slug ${DRAFT_SLUG} no encontrado`,
    );
  });

  // Missing slug should return 404
  it('GET /api/blog/posts/:slug should return 404 for a missing slug', async () => {
    const response = await http(app).get(`/api/blog/posts/${MISSING_SLUG}`);

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con slug ${MISSING_SLUG} no encontrado`,
    );
  });
});
