import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/billing/guards/subscription.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { scopeFilter } from '../common/rbac/scope';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermission('contacts.view')
  @ApiOperation({ summary: 'List contacts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'isCustomer', required: false, description: 'true = only contacts with at least one won deal' })
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    const result = await this.contactsService.findAll(user.tenantId, query, scopeFilter(user, 'contact'));
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermission('contacts.view')
  @ApiOperation({ summary: 'Get a single contact with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const contact = await this.contactsService.findOne(id, user.tenantId, scopeFilter(user, 'contact'));
    return { success: true, data: contact };
  }

  @Post()
  @RequirePermission('contacts.create')
  @ApiOperation({ summary: 'Create a new contact' })
  async create(@Body() dto: CreateContactDto, @CurrentUser() user: any) {
    const contact = await this.contactsService.create(dto, user.tenantId, user.id);
    return { success: true, data: contact, message: 'Contact created successfully' };
  }

  @Patch(':id')
  @RequirePermission('contacts.update')
  @ApiOperation({ summary: 'Update a contact' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: any,
  ) {
    const contact = await this.contactsService.update(id, dto, user.tenantId, user.id, scopeFilter(user, 'contact'));
    return { success: true, data: contact, message: 'Contact updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('contacts.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a contact' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const result = await this.contactsService.remove(id, user.tenantId, user.id, scopeFilter(user, 'contact'));
    return { success: true, data: result, message: 'Contact deleted' };
  }

  @Patch('bulk/update')
  @RequirePermission('contacts.update')
  @ApiOperation({ summary: 'Bulk update multiple contacts' })
  async bulkUpdate(
    @Body() body: { ids: string[]; data: { ownerId?: string; status?: string } },
    @CurrentUser() user: any,
  ) {
    const result = await this.contactsService.bulkUpdate(body.ids, body.data, user.tenantId);
    return { success: true, data: result };
  }

  @Delete('bulk/delete')
  @RequirePermission('contacts.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple contacts' })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const result = await this.contactsService.bulkDelete(ids, user.tenantId);
    return { success: true, data: result };
  }
}
