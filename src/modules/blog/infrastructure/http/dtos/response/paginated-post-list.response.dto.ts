import { ApiProperty } from '@nestjs/swagger';
import {
  PaginatedMetaDto,
} from '../../../../../../common/dto/response/paginated-meta.response.dto';
import { PostListItemResponseDto } from './post-list-item.response.dto';

export class PaginatedPostListDto {
  @ApiProperty({
    description: 'Posts de la página actual',
    type: [PostListItemResponseDto],
  })
  items: PostListItemResponseDto[];

  @ApiProperty({
    description: 'Metadatos de paginación',
    type: PaginatedMetaDto,
  })
  meta: PaginatedMetaDto;
}
