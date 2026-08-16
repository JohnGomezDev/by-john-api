import { randomUUID } from 'node:crypto';

export class Admin {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly lastName: string,
    readonly username: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    name: string;
    lastName: string;
    username: string;
    email: string;
    passwordHash: string;
  }): Admin {
    const now = new Date();
    return new Admin(
      randomUUID(),
      props.name,
      props.lastName,
      props.username,
      props.email,
      props.passwordHash,
      now,
      now,
    );
  }
}
