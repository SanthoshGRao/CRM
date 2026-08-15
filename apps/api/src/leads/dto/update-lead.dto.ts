import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @IsOptional()
  @IsEnum(['new', 'working', 'qualified', 'unqualified', 'converted', 'lost'])
  status?: string;
}
