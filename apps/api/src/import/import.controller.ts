import { Controller, Get, Post, Body, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ImportService } from './import.service';
import { ImportFileDto } from './dto/import-file.dto';

const TEMPLATE_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('contacts')
  @RequirePermission('contacts.create')
  @ApiOperation({ summary: 'Bulk-create contacts from an uploaded spreadsheet' })
  async importContacts(@Body() dto: ImportFileDto, @CurrentUser() user: any) {
    const result = await this.importService.importContacts(
      user.tenantId, user.id, dto.originalFilename, dto.contentBase64,
    );
    return { success: true, data: result };
  }

  @Post('companies')
  @RequirePermission('companies.create')
  @ApiOperation({ summary: 'Bulk-create companies from an uploaded spreadsheet' })
  async importCompanies(@Body() dto: ImportFileDto, @CurrentUser() user: any) {
    const result = await this.importService.importCompanies(
      user.tenantId, user.id, dto.originalFilename, dto.contentBase64,
    );
    return { success: true, data: result };
  }

  @Post('leads')
  @RequirePermission('leads.create')
  @ApiOperation({ summary: 'Bulk-create leads from an uploaded spreadsheet' })
  async importLeads(@Body() dto: ImportFileDto, @CurrentUser() user: any) {
    if (!dto.pipelineId || !dto.stageId) {
      throw new BadRequestException('pipelineId and stageId are required to import leads.');
    }
    const result = await this.importService.importLeads(
      user.tenantId, user.id, dto.originalFilename, dto.contentBase64, dto.pipelineId, dto.stageId,
    );
    return { success: true, data: result };
  }

  @Get('contacts/template')
  @RequirePermission('contacts.create')
  @ApiOperation({ summary: 'Download a blank contacts import template' })
  contactsTemplate(@Res() res: FastifyReply) {
    this.sendTemplate(res, this.importService.contactsTemplate(), 'contacts-import-template.xlsx');
  }

  @Get('companies/template')
  @RequirePermission('companies.create')
  @ApiOperation({ summary: 'Download a blank companies import template' })
  companiesTemplate(@Res() res: FastifyReply) {
    this.sendTemplate(res, this.importService.companiesTemplate(), 'companies-import-template.xlsx');
  }

  @Get('leads/template')
  @RequirePermission('leads.create')
  @ApiOperation({ summary: 'Download a blank leads import template' })
  leadsTemplate(@Res() res: FastifyReply) {
    this.sendTemplate(res, this.importService.leadsTemplate(), 'leads-import-template.xlsx');
  }

  private sendTemplate(res: FastifyReply, buffer: Buffer, filename: string) {
    res
      .header('Content-Type', TEMPLATE_MIME)
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }
}
