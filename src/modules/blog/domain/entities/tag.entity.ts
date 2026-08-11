import { randomUUID } from 'node:crypto';

export class Tag {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: { name: string; slug: string }): Tag {
    const now = new Date();
    return new Tag(randomUUID(), props.name, props.slug, now, now);
  }
}
