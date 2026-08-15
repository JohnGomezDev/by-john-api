import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { AUTH_MESSAGES } from '../../application/constants/auth-messages.constants';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token/refresh-token.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginRequestDto } from './dtos/request/login.request.dto';
import { LoginResponseDto } from './dtos/response/login.response.dto';
import { RefreshTokenResponseDto } from './dtos/response/refresh-token.response.dto';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

function getRefreshTokenCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_TOKEN_COOKIE];
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al administrador y entrega un access token junto con una cookie de refresh token',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({
    description: 'Usuario logueado con éxito',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Usuario o contraseña incorrectos' })
  @Post('login')
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseDto<LoginResponseDto>> {
    const { accessToken, rawRefreshToken, expiresAt, admin } =
      await this.loginUseCase.execute(
        dto,
        req.headers['user-agent'] ?? 'unknown',
      );

    this.setRefreshTokenCookie(res, rawRefreshToken, expiresAt);

    return ApiResponseDto.ok(
      LoginResponseDto.fromDomain(accessToken, admin),
      AUTH_MESSAGES.LOGIN_SUCCESS,
    );
  }

  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Valida el refresh token de la cookie contra la whitelist y entrega un nuevo par de tokens',
  })
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOkResponse({
    description: 'Token renovado con éxito',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Sesión inválida o expirada' })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseDto<RefreshTokenResponseDto>> {
    const { accessToken, rawRefreshToken, expiresAt } =
      await this.refreshTokenUseCase.execute(
        getRefreshTokenCookie(req),
        req.headers['user-agent'] ?? 'unknown',
      );

    this.setRefreshTokenCookie(res, rawRefreshToken, expiresAt);

    return ApiResponseDto.ok(
      RefreshTokenResponseDto.fromAccessToken(accessToken),
      AUTH_MESSAGES.REFRESH_SUCCESS,
    );
  }

  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Elimina el refresh token de la whitelist y limpia la cookie',
  })
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOkResponse({ description: 'Sesión cerrada con éxito' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseDto<null>> {
    await this.logoutUseCase.execute(getRefreshTokenCookie(req));

    res.clearCookie(REFRESH_TOKEN_COOKIE);

    return ApiResponseDto.ok(null, AUTH_MESSAGES.LOGOUT_SUCCESS);
  }

  private setRefreshTokenCookie(
    res: Response,
    rawRefreshToken: string,
    expiresAt: Date,
  ): void {
    res.cookie(REFRESH_TOKEN_COOKIE, rawRefreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.configService.get('NODE_ENV') === 'production',
      expires: expiresAt,
    });
  }
}
