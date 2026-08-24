import type { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { bearer, loginAs, type IE2eLoginResult } from '../helpers/auth.helper';
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
  anyString,
  body,
  containing,
  http,
  itemSlugs,
} from '../helpers/http.helper';

const OWNER = {
  username: 'e2e.admin.owner',
  password: 'Owner123!',
  email: 'e2e.admin.owner@email.com',
  name: 'Admin',
  lastName: 'Owner',
};

const OTHER = {
  username: 'e2e.admin.other',
  password: 'Other123!',
  email: 'e2e.admin.other@email.com',
  name: 'Admin',
  lastName: 'Other',
};

const SLUG_PREFIX = 'e2e-admin-';
const OWN_DRAFT_SLUG = `${SLUG_PREFIX}own-draft`;
const OWN_PUBLISHED_SLUG = `${SLUG_PREFIX}own-published`;
const OTHER_POST_SLUG = `${SLUG_PREFIX}other-post`;
const SEARCH_TERM = 'e2eadminsearchterm';
const MISSING_UUID = '00000000-0000-4000-8000-000000000001';

describe('Admin posts (e2e)', () => {
  let app: INestApplication;
  let ownerSession: IE2eLoginResult;
  let categoryId: string;
  let otherCategoryId: string;
  let tagId: string;
  let ownDraftId: string;
  let ownPublishedId: string;
  let otherPostId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    await cleanup();

    const owner = await upsertAdmin(app, OWNER);
    const other = await upsertAdmin(app, OTHER);
    const category = await upsertCategory(app, {
      name: 'E2E Admin Backend',
      slug: `${SLUG_PREFIX}backend`,
    });
    const otherCategory = await upsertCategory(app, {
      name: 'E2E Admin Frontend',
      slug: `${SLUG_PREFIX}frontend`,
    });
    const tag = await upsertTag(app, {
      name: 'E2E Admin NestJS',
      slug: `${SLUG_PREFIX}nestjs`,
    });

    categoryId = category.id;
    otherCategoryId = otherCategory.id;
    tagId = tag.id;

    const ownDraft = await insertPost(app, {
      title: 'Own draft',
      slug: OWN_DRAFT_SLUG,
      content: 'Draft content',
      published: false,
      adminId: owner.id,
      categoryId,
      tagIds: [tagId],
    });
    const ownPublished = await insertPost(app, {
      title: `Own published ${SEARCH_TERM}`,
      slug: OWN_PUBLISHED_SLUG,
      content: `Published content ${SEARCH_TERM}`,
      published: true,
      publishedAt: new Date(),
      adminId: owner.id,
      categoryId,
      tagIds: [tagId],
    });
    const otherPost = await insertPost(app, {
      title: 'Other admin post',
      slug: OTHER_POST_SLUG,
      content: 'Should not appear in owner list',
      published: true,
      publishedAt: new Date(),
      adminId: other.id,
      categoryId,
    });

    ownDraftId = ownDraft.id;
    ownPublishedId = ownPublished.id;
    otherPostId = otherPost.id;
    ownerSession = await loginAs(app, OWNER);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await deletePostsBySlugPrefix(app, SLUG_PREFIX);
    await deleteTagsBySlugPrefix(app, SLUG_PREFIX);
    await deleteCategoriesBySlugPrefix(app, SLUG_PREFIX);
    await deleteAdminsByUsernames(app, [OWNER.username, OTHER.username]);
  }

  function createBody(
    overrides?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      title: 'Created post',
      slug: `${SLUG_PREFIX}created`,
      content: 'Created content',
      categoryId,
      tagIds: [tagId],
      ...overrides,
    };
  }

  // Controller-level guard should reject anonymous requests
  it('GET /api/admin/posts should return 401 without a token', async () => {
    const response = await http(app).get('/api/admin/posts');

    expect(response.status).toBe(401);
  });

  // Create a draft owned by the authenticated admin
  it('POST /api/admin/posts should create a draft post', async () => {
    const response = await http(app)
      .post('/api/admin/posts')
      .set(bearer(ownerSession.accessToken))
      .send(createBody());

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Post creado exitosamente',
      data: containing({
        title: 'Created post',
        slug: `${SLUG_PREFIX}created`,
        content: 'Created content',
        published: false,
        publishedAt: null,
        category: containing({ id: categoryId }),
        tags: [containing({ id: tagId })],
      }),
    });
  });

  // Empty body should fail validation
  it('POST /api/admin/posts should return 400 without a body', async () => {
    const response = await http(app)
      .post('/api/admin/posts')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining([
        'El título es requerido',
        'El slug es requerido',
        'El contenido es requerido',
      ]),
    );
  });

  // Invalid category UUID format should fail validation
  it('POST /api/admin/posts should return 400 for an invalid category UUID', async () => {
    const response = await http(app)
      .post('/api/admin/posts')
      .set(bearer(ownerSession.accessToken))
      .send(
        createBody({
          slug: `${SLUG_PREFIX}bad-uuid`,
          categoryId: 'not-a-uuid',
        }),
      );

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El categoryId debe ser un UUID válido']),
    );
  });

  // Unknown category UUID should return 404
  it('POST /api/admin/posts should return 404 for a missing category', async () => {
    const response = await http(app)
      .post('/api/admin/posts')
      .set(bearer(ownerSession.accessToken))
      .send(
        createBody({
          slug: `${SLUG_PREFIX}missing-category`,
          categoryId: MISSING_UUID,
        }),
      );

    expect(response.status).toBe(404);
    expect(body(response).message).toBe('La categoría especificada no existe');
  });

  // Duplicate slug should conflict
  it('POST /api/admin/posts should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .post('/api/admin/posts')
      .set(bearer(ownerSession.accessToken))
      .send(createBody({ slug: OWN_PUBLISHED_SLUG }));

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      `El post con el slug ${OWN_PUBLISHED_SLUG} ya existe`,
    );
  });

  // Admin list should only include the authenticated user's posts
  it('GET /api/admin/posts should list only the owner posts', async () => {
    const response = await http(app)
      .get('/api/admin/posts?limit=50')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    const slugs = itemSlugs(response);
    expect(slugs).toContain(OWN_DRAFT_SLUG);
    expect(slugs).toContain(OWN_PUBLISHED_SLUG);
    expect(slugs).not.toContain(OTHER_POST_SLUG);
  });

  // Pagination metadata should respect limit
  it('GET /api/admin/posts should paginate with limit 1', async () => {
    const response = await http(app)
      .get('/api/admin/posts?page=1&limit=1')
      .set(bearer(ownerSession.accessToken));

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

  // Full-text search should match the owner published fixture
  it('GET /api/admin/posts should filter by search term', async () => {
    const response = await http(app)
      .get(`/api/admin/posts?search=${SEARCH_TERM}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    const slugs = itemSlugs(response);
    expect(slugs).toContain(OWN_PUBLISHED_SLUG);
    expect(slugs).not.toContain(OWN_DRAFT_SLUG);
  });

  // Page below 1 should be rejected
  it('GET /api/admin/posts should return 400 when page is 0', async () => {
    const response = await http(app)
      .get('/api/admin/posts?page=0')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El page debe ser al menos 1']),
    );
  });

  // Limit above 50 should be rejected
  it('GET /api/admin/posts should return 400 when limit is 51', async () => {
    const response = await http(app)
      .get('/api/admin/posts?limit=51')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El limit no puede superar 50']),
    );
  });

  // Owner can load a post by id
  it('GET /api/admin/posts/:id should return the owner post', async () => {
    const response = await http(app)
      .get(`/api/admin/posts/${ownDraftId}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Post obtenido exitosamente',
      data: containing({
        id: ownDraftId,
        slug: OWN_DRAFT_SLUG,
        published: false,
      }),
    });
  });

  // Missing id should return 404
  it('GET /api/admin/posts/:id should return 404 for a missing post', async () => {
    const response = await http(app)
      .get(`/api/admin/posts/${MISSING_UUID}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con id ${MISSING_UUID} no encontrado`,
    );
  });

  // Another admin's post should be forbidden
  it('GET /api/admin/posts/:id should return 403 for another admin post', async () => {
    const response = await http(app)
      .get(`/api/admin/posts/${otherPostId}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(403);
    expect(body(response).message).toBe(
      'No tienes permiso para acceder a este post',
    );
  });

  // Invalid UUID param should be rejected
  it('GET /api/admin/posts/:id should return 400 for an invalid UUID', async () => {
    const response = await http(app)
      .get('/api/admin/posts/not-a-uuid')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
  });

  // Partial update should persist the sent fields
  it('PATCH /api/admin/posts/:id should update the owner post', async () => {
    const target = await insertPost(app, {
      title: 'Update target',
      slug: `${SLUG_PREFIX}update-target`,
      content: 'Original content',
      published: false,
      adminId: ownerSession.adminId,
      categoryId,
      tagIds: [tagId],
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${target.id}`)
      .set(bearer(ownerSession.accessToken))
      .send({
        title: 'Updated title',
        slug: `${SLUG_PREFIX}updated-slug`,
        content: 'Updated content',
        categoryId: otherCategoryId,
      });

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Post actualizado exitosamente',
      data: containing({
        id: target.id,
        title: 'Updated title',
        slug: `${SLUG_PREFIX}updated-slug`,
        content: 'Updated content',
        category: containing({ id: otherCategoryId }),
      }),
    });
  });

  // Updating to an existing slug should conflict
  it('PATCH /api/admin/posts/:id should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${ownDraftId}`)
      .set(bearer(ownerSession.accessToken))
      .send({ slug: OWN_PUBLISHED_SLUG });

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      `El post con el slug ${OWN_PUBLISHED_SLUG} ya existe`,
    );
  });

  // Updating to a missing category should return 404
  it('PATCH /api/admin/posts/:id should return 404 for a missing category', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${ownDraftId}`)
      .set(bearer(ownerSession.accessToken))
      .send({ categoryId: MISSING_UUID });

    expect(response.status).toBe(404);
    expect(body(response).message).toBe('La categoría especificada no existe');
  });

  // Updating another admin's post should be forbidden
  it('PATCH /api/admin/posts/:id should return 403 for another admin post', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${otherPostId}`)
      .set(bearer(ownerSession.accessToken))
      .send({ title: 'Hacked title' });

    expect(response.status).toBe(403);
    expect(body(response).message).toBe(
      'No tienes permiso para editar este post',
    );
  });

  // Invalid UUID param should be rejected on update
  it('PATCH /api/admin/posts/:id should return 400 for an invalid UUID', async () => {
    const response = await http(app)
      .patch('/api/admin/posts/not-a-uuid')
      .set(bearer(ownerSession.accessToken))
      .send({ title: 'Nope' });

    expect(response.status).toBe(400);
  });

  // First publish should set publishedAt
  it('PATCH /api/admin/posts/:id/publish should publish a draft', async () => {
    const draft = await insertPost(app, {
      title: 'Publish target',
      slug: `${SLUG_PREFIX}publish-target`,
      content: 'Publishable content',
      published: false,
      adminId: ownerSession.adminId,
      categoryId,
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${draft.id}/publish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body<{ published: boolean }>(response).data.published).toBe(true);
    expect(body<{ publishedAt: string }>(response).data.publishedAt).toEqual(
      anyString,
    );
  });

  // Re-publish should keep the original publishedAt
  it('PATCH /api/admin/posts/:id/publish should be idempotent', async () => {
    const first = await http(app)
      .patch(`/api/admin/posts/${ownPublishedId}/publish`)
      .set(bearer(ownerSession.accessToken));
    const publishedAt = body<{ publishedAt: string }>(first).data.publishedAt;

    const response = await http(app)
      .patch(`/api/admin/posts/${ownPublishedId}/publish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body<{ published: boolean }>(response).data.published).toBe(true);
    expect(body<{ publishedAt: string }>(response).data.publishedAt).toBe(
      publishedAt,
    );
  });

  // Publishing another admin's post should be forbidden
  it('PATCH /api/admin/posts/:id/publish should return 403 for another admin post', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${otherPostId}/publish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(403);
    expect(body(response).message).toBe(
      'No tienes permiso para publicar este post',
    );
  });

  // Publishing a missing post should return 404
  it('PATCH /api/admin/posts/:id/publish should return 404 for a missing post', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${MISSING_UUID}/publish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con id ${MISSING_UUID} no encontrado`,
    );
  });

  // Incomplete posts cannot be published
  it('PATCH /api/admin/posts/:id/publish should return 400 for an incomplete post', async () => {
    const incomplete = await insertPost(app, {
      title: '',
      slug: `${SLUG_PREFIX}incomplete`,
      content: '',
      excerpt: 'x',
      published: false,
      adminId: ownerSession.adminId,
      categoryId,
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${incomplete.id}/publish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toBe(
      'No se puede publicar un post incompleto',
    );
  });

  // Unpublish should keep the original publishedAt
  it('PATCH /api/admin/posts/:id/unpublish should unpublish and keep publishedAt', async () => {
    const published = await insertPost(app, {
      title: 'Unpublish target',
      slug: `${SLUG_PREFIX}unpublish-target`,
      content: 'Published then unpublished',
      published: true,
      publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      adminId: ownerSession.adminId,
      categoryId,
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${published.id}/unpublish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body<{ published: boolean }>(response).data.published).toBe(false);
    expect(
      new Date(
        body<{ publishedAt: string }>(response).data.publishedAt,
      ).toISOString(),
    ).toBe('2024-01-01T00:00:00.000Z');
  });

  // Re-unpublish should not error
  it('PATCH /api/admin/posts/:id/unpublish should be idempotent', async () => {
    const unpublished = await insertPost(app, {
      title: 'Already unpublished',
      slug: `${SLUG_PREFIX}already-unpublished`,
      content: 'Already unpublished',
      published: false,
      publishedAt: new Date('2024-02-02T00:00:00.000Z'),
      adminId: ownerSession.adminId,
      categoryId,
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${unpublished.id}/unpublish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body<{ published: boolean }>(response).data.published).toBe(false);
    expect(
      new Date(
        body<{ publishedAt: string }>(response).data.publishedAt,
      ).toISOString(),
    ).toBe('2024-02-02T00:00:00.000Z');
  });

  // Unpublishing another admin's post should be forbidden
  it('PATCH /api/admin/posts/:id/unpublish should return 403 for another admin post', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${otherPostId}/unpublish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(403);
    expect(body(response).message).toBe(
      'No tienes permiso para despublicar este post',
    );
  });

  // Unpublishing a missing post should return 404
  it('PATCH /api/admin/posts/:id/unpublish should return 404 for a missing post', async () => {
    const response = await http(app)
      .patch(`/api/admin/posts/${MISSING_UUID}/unpublish`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con id ${MISSING_UUID} no encontrado`,
    );
  });

  // Delete should remove the owner post
  it('DELETE /api/admin/posts/:id should delete the owner post', async () => {
    const target = await insertPost(app, {
      title: 'Delete target',
      slug: `${SLUG_PREFIX}delete-target`,
      content: 'To be deleted',
      published: false,
      adminId: ownerSession.adminId,
      categoryId,
    });

    const response = await http(app)
      .delete(`/api/admin/posts/${target.id}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Post eliminado exitosamente',
      data: null,
    });

    const missing = await http(app)
      .get(`/api/admin/posts/${target.id}`)
      .set(bearer(ownerSession.accessToken));

    expect(missing.status).toBe(404);
  });

  // Deleting another admin's post should be forbidden
  it('DELETE /api/admin/posts/:id should return 403 for another admin post', async () => {
    const response = await http(app)
      .delete(`/api/admin/posts/${otherPostId}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(403);
    expect(body(response).message).toBe(
      'No tienes permiso para eliminar este post',
    );
  });

  // Deleting a missing post should return 404
  it('DELETE /api/admin/posts/:id should return 404 for a missing post', async () => {
    const response = await http(app)
      .delete(`/api/admin/posts/${MISSING_UUID}`)
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Post con id ${MISSING_UUID} no encontrado`,
    );
  });

  // Invalid UUID param should be rejected on delete
  it('DELETE /api/admin/posts/:id should return 400 for an invalid UUID', async () => {
    const response = await http(app)
      .delete('/api/admin/posts/not-a-uuid')
      .set(bearer(ownerSession.accessToken));

    expect(response.status).toBe(400);
  });
});
