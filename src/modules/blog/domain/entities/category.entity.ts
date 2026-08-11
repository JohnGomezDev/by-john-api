import { randomUUID } from 'node:crypto';

export class Category {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: { name: string; slug: string }): Category {
    const now = new Date();
    return new Category(randomUUID(), props.name, props.slug, now, now);
  }
}
