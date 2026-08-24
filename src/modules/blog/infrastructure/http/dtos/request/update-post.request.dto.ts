import { PartialType, PickType } from '@nestjs/swagger';
import { CreatePostRequestDto } from './create-post.request.dto';

export class UpdatePostRequestDto extends PartialType(
  PickType(CreatePostRequestDto, [
    'title',
    'slug',
    'content',
    'excerpt',
    'categoryId',
    'tagIds',
    'metaTitle',
    'metaDescription',
    'ogImageUrl',
  ] as const),
) {}
