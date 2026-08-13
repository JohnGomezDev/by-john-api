import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ICurrentUser } from '../passport/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ICurrentUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: ICurrentUser }>();
    return request.user;
  },
);
