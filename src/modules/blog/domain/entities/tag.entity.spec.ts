import { randomUUID } from 'node:crypto';
import { Tag } from './tag.entity';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('Tag', () => {
  const fixedUuid = '55555555-5555-5555-5555-555555555555';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    (randomUUID as jest.Mock).mockReturnValue(fixedUuid);
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create a tag with name and slug
  it('should create a tag with provided props', () => {
    const tag = Tag.create({
      name: 'NestJS',
      slug: 'nestjs',
    });

    expect(tag).toEqual(
      expect.objectContaining({
        id: fixedUuid,
        name: 'NestJS',
        slug: 'nestjs',
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });
});
