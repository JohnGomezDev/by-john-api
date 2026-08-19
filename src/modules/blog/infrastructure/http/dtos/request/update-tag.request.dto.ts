import { PartialType } from '@nestjs/swagger';
import { CreateTagRequestDto } from './create-tag.request.dto';

export class UpdateTagRequestDto extends PartialType(CreateTagRequestDto) {}
