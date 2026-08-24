import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'Nuevo access token JWT de corta duración' })
  accessToken: string;

  static fromAccessToken(accessToken: string): RefreshTokenResponseDto {
    const dto = new RefreshTokenResponseDto();
    dto.accessToken = accessToken;
    return dto;
  }
}
