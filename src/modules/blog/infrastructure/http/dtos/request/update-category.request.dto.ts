import { PartialType } from '@nestjs/swagger';
import { CreateCategoryRequestDto } from './create-category.request.dto';

export class UpdateCategoryRequestDto extends PartialType(
  CreateCategoryRequestDto,
) {}
