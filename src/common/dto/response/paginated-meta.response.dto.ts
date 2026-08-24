import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({
    description: 'Cantidad de ítems en la página actual',
    example: 10,
  })
  itemCount: number;

  @ApiPropertyOptional({
    description: 'Total de ítems',
    example: 42,
  })
  totalItems?: number;

  @ApiProperty({
    description: 'Ítems solicitados por página',
    example: 10,
  })
  itemsPerPage: number;

  @ApiPropertyOptional({
    description: 'Total de páginas',
    example: 5,
  })
  totalPages?: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  currentPage: number;
}
