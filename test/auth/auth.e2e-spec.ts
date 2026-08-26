import type { INestApplication } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../src/modules/auth/application/constants/auth-messages.constants';
import { createE2eApp } from '../helpers/create-e2e-app';
import {
  bearer,
  getSetCookieHeader,
  getSetCookiePair,
  loginAs,
} from '../helpers/auth.helper';
import {
  deleteAdminsByUsernames,
  deleteRefreshTokensForAdmin,
  getRefreshTokenRepository,
  upsertAdmin,
} from '../helpers/fixtures';
import { anyString, body, http } from '../helpers/http.helper';

const ADMIN = {
  username: 'e2e.auth.admin',
  password: 'Auth123!',
  email: 'e2e.auth.admin@email.com',
  name: 'Auth',
  lastName: 'Admin',
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let adminId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    await deleteAdminsByUsernames(app, [ADMIN.username]);
    const admin = await upsertAdmin(app, ADMIN);
    adminId = admin.id;
  });

  afterAll(async () => {
    await deleteAdminsByUsernames(app, [ADMIN.username]);
    await app.close();
  });

  afterEach(async () => {
    await deleteRefreshTokensForAdmin(app, adminId);
  });

  // Login without a body should fail validation
  it('POST /api/auth/login should throw if no body', async () => {
    const response = await http(app).post('/api/auth/login');

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining([
        'El nombre de usuario es requerido',
        'La contraseña es requerida',
      ]),
    );
  });

  // Unknown username should not leak which field failed
  it('POST /api/auth/login should throw if username is unknown', async () => {
    const response = await http(app)
      .post('/api/auth/login')
      .send({ username: 'missing.admin', password: ADMIN.password });

    expect(response.status).toBe(401);
    expect(body(response).message).toBe(AUTH_MESSAGES.INVALID_CREDENTIALS);
  });

  // Wrong password should use the same message
  it('POST /api/auth/login should throw if password is wrong', async () => {
    const response = await http(app)
      .post('/api/auth/login')
      .send({ username: ADMIN.username, password: 'WrongPass1' });

    expect(response.status).toBe(401);
    expect(body(response).message).toBe(AUTH_MESSAGES.INVALID_CREDENTIALS);
  });

  // Successful login should return tokens and set the refresh cookie
  it('POST /api/auth/login should login successfully', async () => {
    const response = await http(app)
      .post('/api/auth/login')
      .send({ username: ADMIN.username, password: ADMIN.password });

    const refreshCookie = getSetCookieHeader(response, 'refresh_token');

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: {
        accessToken: anyString,
        admin: {
          id: adminId,
          username: ADMIN.username,
          email: ADMIN.email,
          name: ADMIN.name,
          lastName: ADMIN.lastName,
        },
      },
    });
    expect(refreshCookie).toEqual(expect.stringContaining('refresh_token='));
    expect(refreshCookie).toEqual(expect.stringMatching(/HttpOnly/i));
  });

  // Refresh without a cookie should be an invalid session
  it('POST /api/auth/refresh should throw if cookie is missing', async () => {
    const response = await http(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(body(response).message).toBe(AUTH_MESSAGES.INVALID_SESSION);
  });

  // Malformed cookie should be an invalid session
  it('POST /api/auth/refresh should throw if cookie is malformed', async () => {
    const response = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=not-a-valid-token');

    expect(response.status).toBe(401);
    expect(body(response).message).toBe(AUTH_MESSAGES.INVALID_SESSION);
  });

  // Valid refresh should rotate the cookie and issue a new access token
  it('POST /api/auth/refresh should rotate a valid refresh token', async () => {
    const session = await loginAs(app, ADMIN);

    const response = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.refreshCookie);

    const newCookie = getSetCookiePair(response, 'refresh_token');

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      data: {
        accessToken: anyString,
      },
    });
    expect(newCookie).toEqual(expect.stringContaining('refresh_token='));
    expect(newCookie).not.toBe(session.refreshCookie);
  });

  // Reusing the previous refresh cookie should fail after rotation
  it('POST /api/auth/refresh should reject a reused refresh cookie', async () => {
    const session = await loginAs(app, ADMIN);

    const firstRefresh = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.refreshCookie);

    expect(firstRefresh.status).toBe(201);

    const response = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.refreshCookie);

    expect(response.status).toBe(401);
    expect(body(response).message).toBe(AUTH_MESSAGES.EXPIRED_SESSION);
  });

  // Concurrent refresh with the same cookie must be atomic: one rotates, one is rejected
  it('POST /api/auth/refresh should handle concurrent refreshes atomically', async () => {
    const session = await loginAs(app, ADMIN);

    const [first, second] = await Promise.all([
      http(app).post('/api/auth/refresh').set('Cookie', session.refreshCookie),
      http(app).post('/api/auth/refresh').set('Cookie', session.refreshCookie),
    ]);

    const successes = [first, second].filter((response) => response.status === 201);
    const failures = [first, second].filter((response) => response.status === 401);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(body(successes[0])).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      data: {
        accessToken: anyString,
      },
    });
    expect(body(failures[0]).message).toBe(AUTH_MESSAGES.EXPIRED_SESSION);

    const rotatedCookie = getSetCookiePair(successes[0], 'refresh_token');
    expect(rotatedCookie).toEqual(expect.stringContaining('refresh_token='));
    expect(rotatedCookie).not.toBe(session.refreshCookie);

    const tokens = await getRefreshTokenRepository(app).find({
      where: { adminId },
    });
    expect(tokens).toHaveLength(1);

    const followUp = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', rotatedCookie!);

    expect(followUp.status).toBe(201);
    expect(body(followUp)).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      data: {
        accessToken: anyString,
      },
    });

    const replay = await http(app)
      .post('/api/auth/refresh')
      .set('Cookie', session.refreshCookie);

    expect(replay.status).toBe(401);
    expect(body(replay).message).toBe(AUTH_MESSAGES.EXPIRED_SESSION);
  });

  // Logout requires an access token
  it('DELETE /api/auth/logout should throw if not authenticated', async () => {
    const response = await http(app).delete('/api/auth/logout');

    expect(response.status).toBe(401);
  });

  // Logout with token and cookie should succeed and clear the cookie
  it('DELETE /api/auth/logout should logout and clear the cookie', async () => {
    const session = await loginAs(app, ADMIN);

    const response = await http(app)
      .delete('/api/auth/logout')
      .set(bearer(session.accessToken))
      .set('Cookie', session.refreshCookie);

    const clearedCookie = getSetCookieHeader(response, 'refresh_token');

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.LOGOUT_SUCCESS,
      data: null,
    });
    expect(clearedCookie).toEqual(expect.stringContaining('refresh_token='));
  });

  // Logout remains successful when the refresh cookie is missing
  it('DELETE /api/auth/logout should succeed without a refresh cookie', async () => {
    const session = await loginAs(app, ADMIN);

    const response = await http(app)
      .delete('/api/auth/logout')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: AUTH_MESSAGES.LOGOUT_SUCCESS,
      data: null,
    });
  });
});
