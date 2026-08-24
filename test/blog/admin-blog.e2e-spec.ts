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
import { anyString, body, containing, http } from '../helpers/http.helper';

const ADMIN = {
  username: 'e2e.ablog.admin',
  password: 'Ablog123!',
  email: 'e2e.ablog.admin@email.com',
  name: 'Ablog',
  lastName: 'Admin',
};

const SLUG_PREFIX = 'e2e-ablog-';
const CATEGORY_SLUG = `${SLUG_PREFIX}backend`;
const OTHER_CATEGORY_SLUG = `${SLUG_PREFIX}frontend`;
const TAG_SLUG = `${SLUG_PREFIX}nestjs`;
const OTHER_TAG_SLUG = `${SLUG_PREFIX}react`;
const POST_SLUG = `${SLUG_PREFIX}linked-post`;
const MISSING_UUID = '00000000-0000-4000-8000-000000000001';

describe('Admin blog (e2e)', () => {
  let app: INestApplication;
  let session: IE2eLoginResult;
  let categoryId: string;
  let otherCategoryId: string;
  let tagId: string;
  let otherTagId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    await cleanup();

    const admin = await upsertAdmin(app, ADMIN);
    const category = await upsertCategory(app, {
      name: 'E2E ABlog Backend',
      slug: CATEGORY_SLUG,
    });
    const otherCategory = await upsertCategory(app, {
      name: 'E2E ABlog Frontend',
      slug: OTHER_CATEGORY_SLUG,
    });
    const tag = await upsertTag(app, {
      name: 'E2E ABlog NestJS',
      slug: TAG_SLUG,
    });
    const otherTag = await upsertTag(app, {
      name: 'E2E ABlog React',
      slug: OTHER_TAG_SLUG,
    });

    categoryId = category.id;
    otherCategoryId = otherCategory.id;
    tagId = tag.id;
    otherTagId = otherTag.id;

    await insertPost(app, {
      title: 'Linked post',
      slug: POST_SLUG,
      content: 'Keeps category and tag from being deleted',
      published: false,
      adminId: admin.id,
      categoryId,
      tagIds: [tagId],
    });

    session = await loginAs(app, ADMIN);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await deletePostsBySlugPrefix(app, SLUG_PREFIX);
    await deleteTagsBySlugPrefix(app, SLUG_PREFIX);
    await deleteCategoriesBySlugPrefix(app, SLUG_PREFIX);
    await deleteAdminsByUsernames(app, [ADMIN.username]);
  }

  // Controller-level guard should reject anonymous requests
  it('POST /api/admin/blog/categories should return 401 without a token', async () => {
    const response = await http(app)
      .post('/api/admin/blog/categories')
      .send({ name: 'Nope', slug: `${SLUG_PREFIX}nope` });

    expect(response.status).toBe(401);
  });

  // Create category should persist name and slug
  it('POST /api/admin/blog/categories should create a category', async () => {
    const response = await http(app)
      .post('/api/admin/blog/categories')
      .set(bearer(session.accessToken))
      .send({ name: 'E2E ABlog Created', slug: `${SLUG_PREFIX}created` });

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Categoría creada exitosamente',
      data: containing({
        id: anyString,
        name: 'E2E ABlog Created',
        slug: `${SLUG_PREFIX}created`,
      }),
    });
  });

  // Empty body should fail validation
  it('POST /api/admin/blog/categories should return 400 without a body', async () => {
    const response = await http(app)
      .post('/api/admin/blog/categories')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining([
        'El nombre es requerido',
        'El slug es requerido',
      ]),
    );
  });

  // Duplicate slug should conflict
  it('POST /api/admin/blog/categories should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .post('/api/admin/blog/categories')
      .set(bearer(session.accessToken))
      .send({ name: 'E2E ABlog Dup', slug: CATEGORY_SLUG });

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'Ya existe una categoría con ese nombre o slug',
    );
  });

  // Partial update should persist the sent fields
  it('PATCH /api/admin/blog/categories/:id should update a category', async () => {
    const target = await upsertCategory(app, {
      name: 'E2E ABlog Update Target',
      slug: `${SLUG_PREFIX}update-target`,
    });

    const response = await http(app)
      .patch(`/api/admin/blog/categories/${target.id}`)
      .set(bearer(session.accessToken))
      .send({ name: 'E2E ABlog Updated', slug: `${SLUG_PREFIX}updated` });

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Categoría actualizada exitosamente',
      data: containing({
        id: target.id,
        name: 'E2E ABlog Updated',
        slug: `${SLUG_PREFIX}updated`,
      }),
    });
  });

  // Updating to an existing slug should conflict
  it('PATCH /api/admin/blog/categories/:id should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .patch(`/api/admin/blog/categories/${otherCategoryId}`)
      .set(bearer(session.accessToken))
      .send({ slug: CATEGORY_SLUG });

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'Ya existe una categoría con ese nombre o slug',
    );
  });

  // Missing category should return 404
  it('PATCH /api/admin/blog/categories/:id should return 404 for a missing category', async () => {
    const response = await http(app)
      .patch(`/api/admin/blog/categories/${MISSING_UUID}`)
      .set(bearer(session.accessToken))
      .send({ name: 'Missing' });

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Categoría con id ${MISSING_UUID} no encontrada`,
    );
  });

  // Invalid UUID param should be rejected
  it('PATCH /api/admin/blog/categories/:id should return 400 for an invalid UUID', async () => {
    const response = await http(app)
      .patch('/api/admin/blog/categories/not-a-uuid')
      .set(bearer(session.accessToken))
      .send({ name: 'Nope' });

    expect(response.status).toBe(400);
  });

  // Unused category can be deleted
  it('DELETE /api/admin/blog/categories/:id should delete an unused category', async () => {
    const target = await upsertCategory(app, {
      name: 'E2E ABlog Delete Target',
      slug: `${SLUG_PREFIX}delete-target`,
    });

    const response = await http(app)
      .delete(`/api/admin/blog/categories/${target.id}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Categoría eliminada exitosamente',
      data: null,
    });
  });

  // Category with posts cannot be deleted
  it('DELETE /api/admin/blog/categories/:id should return 409 when posts exist', async () => {
    const response = await http(app)
      .delete(`/api/admin/blog/categories/${categoryId}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'No se puede eliminar la categoría porque tiene posts asociados',
    );
  });

  // Missing category delete should return 404
  it('DELETE /api/admin/blog/categories/:id should return 404 for a missing category', async () => {
    const response = await http(app)
      .delete(`/api/admin/blog/categories/${MISSING_UUID}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Categoría con id ${MISSING_UUID} no encontrada`,
    );
  });

  // Create tag should persist name and slug
  it('POST /api/admin/blog/tags should create a tag', async () => {
    const response = await http(app)
      .post('/api/admin/blog/tags')
      .set(bearer(session.accessToken))
      .send({
        name: 'E2E ABlog Tag Created',
        slug: `${SLUG_PREFIX}tag-created`,
      });

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Tag creado exitosamente',
      data: containing({
        id: anyString,
        name: 'E2E ABlog Tag Created',
        slug: `${SLUG_PREFIX}tag-created`,
      }),
    });
  });

  // Empty body should fail validation
  it('POST /api/admin/blog/tags should return 400 without a body', async () => {
    const response = await http(app)
      .post('/api/admin/blog/tags')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining([
        'El nombre es requerido',
        'El slug es requerido',
      ]),
    );
  });

  // Duplicate tag slug should conflict
  it('POST /api/admin/blog/tags should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .post('/api/admin/blog/tags')
      .set(bearer(session.accessToken))
      .send({ name: 'E2E ABlog Tag Dup', slug: TAG_SLUG });

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'Ya existe un tag con ese nombre o slug',
    );
  });

  // Partial update should persist the sent fields
  it('PATCH /api/admin/blog/tags/:id should update a tag', async () => {
    const target = await upsertTag(app, {
      name: 'E2E ABlog Tag Update Target',
      slug: `${SLUG_PREFIX}tag-update-target`,
    });

    const response = await http(app)
      .patch(`/api/admin/blog/tags/${target.id}`)
      .set(bearer(session.accessToken))
      .send({
        name: 'E2E ABlog Tag Updated',
        slug: `${SLUG_PREFIX}tag-updated`,
      });

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Tag actualizado exitosamente',
      data: containing({
        id: target.id,
        name: 'E2E ABlog Tag Updated',
        slug: `${SLUG_PREFIX}tag-updated`,
      }),
    });
  });

  // Updating to an existing slug should conflict
  it('PATCH /api/admin/blog/tags/:id should return 409 for a duplicate slug', async () => {
    const response = await http(app)
      .patch(`/api/admin/blog/tags/${otherTagId}`)
      .set(bearer(session.accessToken))
      .send({ slug: TAG_SLUG });

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'Ya existe un tag con ese nombre o slug',
    );
  });

  // Missing tag should return 404
  it('PATCH /api/admin/blog/tags/:id should return 404 for a missing tag', async () => {
    const response = await http(app)
      .patch(`/api/admin/blog/tags/${MISSING_UUID}`)
      .set(bearer(session.accessToken))
      .send({ name: 'Missing' });

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Tag con id ${MISSING_UUID} no encontrado`,
    );
  });

  // Invalid UUID param should be rejected
  it('PATCH /api/admin/blog/tags/:id should return 400 for an invalid UUID', async () => {
    const response = await http(app)
      .patch('/api/admin/blog/tags/not-a-uuid')
      .set(bearer(session.accessToken))
      .send({ name: 'Nope' });

    expect(response.status).toBe(400);
  });

  // Unused tag can be deleted
  it('DELETE /api/admin/blog/tags/:id should delete an unused tag', async () => {
    const target = await upsertTag(app, {
      name: 'E2E ABlog Tag Delete Target',
      slug: `${SLUG_PREFIX}tag-delete-target`,
    });

    const response = await http(app)
      .delete(`/api/admin/blog/tags/${target.id}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: 'Tag eliminado exitosamente',
      data: null,
    });
  });

  // Tag linked to posts cannot be deleted
  it('DELETE /api/admin/blog/tags/:id should return 409 when posts exist', async () => {
    const response = await http(app)
      .delete(`/api/admin/blog/tags/${tagId}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(409);
    expect(body(response).message).toBe(
      'No se puede eliminar el tag porque está asociado a posts',
    );
  });

  // Missing tag delete should return 404
  it('DELETE /api/admin/blog/tags/:id should return 404 for a missing tag', async () => {
    const response = await http(app)
      .delete(`/api/admin/blog/tags/${MISSING_UUID}`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      `Tag con id ${MISSING_UUID} no encontrado`,
    );
  });
});
