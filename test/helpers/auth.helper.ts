import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';
import { body, cookieHeaderList, http } from './http.helper';

export interface IE2eLoginResult {
  accessToken: string;
  refreshCookie: string;
  adminId: string;
}

export function getSetCookiePair(
  response: Response,
  cookieName: string,
): string | undefined {
  const found = cookieHeaderList(response).find((cookie) =>
    cookie.startsWith(`${cookieName}=`),
  );
  return found?.split(';')[0];
}

export function getSetCookieHeader(
  response: Response,
  cookieName: string,
): string | undefined {
  return cookieHeaderList(response).find((cookie) =>
    cookie.startsWith(`${cookieName}=`),
  );
}

export async function loginAs(
  app: INestApplication,
  credentials: { username: string; password: string },
): Promise<IE2eLoginResult> {
  const response = await http(app).post('/api/auth/login').send({
    username: credentials.username,
    password: credentials.password,
  });

  const refreshCookie = getSetCookiePair(response, 'refresh_token');
  if (response.status !== 201 || !refreshCookie) {
    throw new Error(
      `E2E login failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }

  const payload = body<{ accessToken: string; admin: { id: string } }>(
    response,
  );

  return {
    accessToken: payload.data.accessToken,
    refreshCookie,
    adminId: payload.data.admin.id,
  };
}

export function bearer(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}
