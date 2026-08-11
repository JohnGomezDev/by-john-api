import { randomUUID } from 'node:crypto';

export class AdminRefreshToken {
  constructor(
    readonly id: string,
    readonly tokenHash: string,
    readonly userAgent: string,
    readonly expiresAt: Date,
    readonly createdAt: Date,
    readonly adminId: string,
  ) {}

  static create(props: {
    tokenHash: string;
    userAgent: string;
    expiresAt: Date;
    adminId: string;
  }): AdminRefreshToken {
    return new AdminRefreshToken(
      randomUUID(),
      props.tokenHash,
      props.userAgent,
      props.expiresAt,
      new Date(),
      props.adminId,
    );
  }

  get isExpired(): boolean {
    return this.expiresAt.getTime() <= Date.now();
  }
}
