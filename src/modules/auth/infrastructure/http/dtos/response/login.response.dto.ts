import { ApiProperty } from '@nestjs/swagger';
import type { Admin } from '../../../../../admin/domain/entities/admin.entity';
import { AdminResponseDto } from './admin.response.dto';

export class LoginResponseDto {
  @ApiProperty({ description: 'Access token JWT de corta duración' })
  accessToken: string;

  @ApiProperty({
    description: 'Administrador autenticado',
    type: AdminResponseDto,
  })
  admin: AdminResponseDto;

  static fromDomain(accessToken: string, admin: Admin): LoginResponseDto {
    const dto = new LoginResponseDto();
    dto.accessToken = accessToken;
    dto.admin = AdminResponseDto.fromDomain(admin);
    return dto;
  }
}
