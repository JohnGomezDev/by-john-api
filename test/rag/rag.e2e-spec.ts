import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { PostChunkTypeOrmEntity } from '../../src/modules/rag/infrastructure/persistence/typeorm/post-chunk.typeorm-entity';
import { createE2eApp } from '../helpers/create-e2e-app';
import { bearer, loginAs, type IE2eLoginResult } from '../helpers/auth.helper';
import {
  deleteAdminsByUsernames,
  deleteCategoriesBySlugPrefix,
  deletePostsBySlugPrefix,
  insertPost,
  upsertAdmin,
  upsertCategory,
} from '../helpers/fixtures';
import { body, http } from '../helpers/http.helper';

const ADMIN = {
  username: 'e2e.rag.admin',
  password: 'Rag12345!',
  email: 'e2e.rag.admin@email.com',
  name: 'Rag',
  lastName: 'Admin',
};

const SLUG_PREFIX = 'e2e-rag-';
const INDEX_TERM = 'e2eragindexterm';

describe('RAG (e2e)', () => {
  let app: INestApplication;
  let session: IE2eLoginResult;
  let categoryId: string;
  let chunkRepository: Repository<PostChunkTypeOrmEntity>;

  beforeAll(async () => {
    app = await createE2eApp();
    chunkRepository = app.get(getRepositoryToken(PostChunkTypeOrmEntity));
    await cleanup();

    await upsertAdmin(app, ADMIN);
    const category = await upsertCategory(app, {
      name: 'E2E RAG',
      slug: `${SLUG_PREFIX}category`,
    });
    categoryId = category.id;
    session = await loginAs(app, ADMIN);
  });

  afterEach(async () => {
    await deletePostsBySlugPrefix(app, SLUG_PREFIX);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await deletePostsBySlugPrefix(app, SLUG_PREFIX);
    await deleteCategoriesBySlugPrefix(app, SLUG_PREFIX);
    await deleteAdminsByUsernames(app, [ADMIN.username]);
  }

  async function waitForChunkCount(
    postId: string,
    expected: number,
  ): Promise<PostChunkTypeOrmEntity[]> {
    const deadline = Date.now() + 5_000;
    let chunks: PostChunkTypeOrmEntity[] = [];

    while (Date.now() < deadline) {
      chunks = await chunkRepository.find({
        where: { postId },
        order: { chunkIndex: 'ASC' },
      });
      if (chunks.length === expected) {
        return chunks;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return chunks;
  }

  // Missing body should fail validation before any retrieval
  it('POST /api/rag/ask should return 400 without a body', async () => {
    const response = await http(app).post('/api/rag/ask');

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['La pregunta es requerida']),
    );
  });

  // Queries shorter than the DTO minimum should be rejected
  it('POST /api/rag/ask should return 400 for a short query', async () => {
    const response = await http(app).post('/api/rag/ask').send({ query: 'ab' });

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['La pregunta debe tener al menos 3 caracteres']),
    );
  });

  // Queries over the DTO maximum should be rejected
  it('POST /api/rag/ask should return 400 for a long query', async () => {
    const response = await http(app)
      .post('/api/rag/ask')
      .send({ query: 'a'.repeat(501) });

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['La pregunta no puede superar 500 caracteres']),
    );
  });

  // Publishing a draft should persist chunks for that post
  it('PATCH /api/admin/posts/:id/publish should index the post', async () => {
    const draft = await insertPost(app, {
      title: `Index ${INDEX_TERM}`,
      slug: `${SLUG_PREFIX}index-target`,
      content: `Contenido indexable ${INDEX_TERM} para el asistente del blog.`,
      published: false,
      adminId: session.adminId,
      categoryId,
    });

    const response = await http(app)
      .patch(`/api/admin/posts/${draft.id}/publish`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);

    const chunks = await waitForChunkCount(draft.id, 1);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[0]?.content).toContain(INDEX_TERM);
  });

  // Unpublishing should remove the chunks created on publish
  it('PATCH /api/admin/posts/:id/unpublish should remove indexed chunks', async () => {
    const draft = await insertPost(app, {
      title: `Unindex ${INDEX_TERM}`,
      slug: `${SLUG_PREFIX}unindex-target`,
      content: `Contenido desindexable ${INDEX_TERM} para el asistente del blog.`,
      published: false,
      adminId: session.adminId,
      categoryId,
    });

    const published = await http(app)
      .patch(`/api/admin/posts/${draft.id}/publish`)
      .set(bearer(session.accessToken));

    expect(published.status).toBe(200);
    await waitForChunkCount(draft.id, 1);

    const response = await http(app)
      .patch(`/api/admin/posts/${draft.id}/unpublish`)
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);

    const chunks = await waitForChunkCount(draft.id, 0);
    expect(chunks).toHaveLength(0);
  });
});
