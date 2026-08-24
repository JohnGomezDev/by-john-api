import { ApiProperty } from '@nestjs/swagger';
import type { IPostAdminSummary } from '../../../../domain/entities/post.entity';

export class AdminSummaryDto {
  @ApiProperty({ description: 'Nombre del administrador', example: 'John' })
  name: string;

  @ApiProperty({
    description: 'Apellido del administrador',
    example: 'Doe',
  })
  lastName: string;

  static fromSummary(admin: IPostAdminSummary): AdminSummaryDto {
    const dto = new AdminSummaryDto();
    dto.name = admin.name;
    dto.lastName = admin.lastName;
    return dto;
  }
}
