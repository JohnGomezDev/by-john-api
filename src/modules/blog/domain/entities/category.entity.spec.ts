import { randomUUID } from 'node:crypto';
import { Category } from './category.entity';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('Category', () => {
  const fixedUuid = '44444444-4444-4444-4444-444444444444';
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    (randomUUID as jest.Mock).mockReturnValue(fixedUuid);
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create a category with name and slug
  it('should create a category with provided props', () => {
    const category = Category.create({
      name: 'Backend',
      slug: 'backend',
    });

    expect(category).toEqual(
      expect.objectContaining({
        id: fixedUuid,
        name: 'Backend',
        slug: 'backend',
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });
});
