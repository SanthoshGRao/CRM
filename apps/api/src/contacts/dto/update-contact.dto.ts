import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @IsOptional()
  @IsEnum(['active', 'inactive', 'blocked'])
  status?: string;
}
