import { randomUUID } from 'node:crypto';

export class Admin {
  constructor(
    readonly id: string,
    readonly username: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    username: string;
    email: string;
    passwordHash: string;
  }): Admin {
    const now = new Date();
    return new Admin(
      randomUUID(),
      props.username,
      props.email,
      props.passwordHash,
      now,
      now,
    );
  }
}
