import { ApiProperty } from '@nestjs/swagger';
import type { Admin } from '../../../../../admin/domain/entities/admin.entity';

export class AdminResponseDto {
  @ApiProperty({ description: 'ID del administrador', example: 'uuid-...' })
  id: string;

  @ApiProperty({ description: 'Nombre de usuario', example: 'admin' })
  username: string;

  @ApiProperty({
    description: 'Correo del administrador',
    example: 'admin@portfolio.com',
  })
  email: string;

  static fromDomain(admin: Admin): AdminResponseDto {
    const dto = new AdminResponseDto();
    dto.id = admin.id;
    dto.username = admin.username;
    dto.email = admin.email;
    return dto;
  }
}
