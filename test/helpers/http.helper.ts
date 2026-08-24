import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

export type TApiOk<T> = {
  status: 'ok';
  message: string;
  data: T;
};

export type TApiError = {
  statusCode: number;
  message: string | string[];
  error: string;
};

export type TPaginated<T> = {
  items: T[];
  meta: {
    itemCount: number;
    itemsPerPage: number;
    currentPage: number;
    totalItems?: number;
    totalPages?: number;
  };
};

export function http(app: INestApplication): ReturnType<typeof request> {
  return request(app.getHttpServer() as App);
}

export function body<T = unknown>(response: Response): TApiOk<T> & TApiError {
  return response.body as TApiOk<T> & TApiError;
}

export function itemSlugs(response: Response): string[] {
  return body<TPaginated<{ slug: string }>>(response).data.items.map(
    (item) => item.slug,
  );
}

export function cookieHeaderList(response: Response): string[] {
  const header = response.headers['set-cookie'] as
    string | string[] | undefined;
  if (!header) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}

export const anyString: string = expect.any(String) as string;
export const anyArray: unknown[] = expect.any(Array) as unknown[];

export function containing<T extends object>(value: Partial<T>): T {
  return expect.objectContaining(value) as T;
}

export function stringContaining(value: string): string {
  return expect.stringContaining(value) as string;
}
