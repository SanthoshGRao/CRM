import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldOptionDto,
  CHOICE_FIELD_TYPES, CUSTOM_FIELD_ENTITIES,
} from './dto/custom-field.dto';

/** Column on CustomFieldValue that links a value to its record. */
const ENTITY_FK: Record<string, 'contactId' | 'companyId' | 'leadId' | 'dealId' | 'taskId'> = {
  contact: 'contactId',
  company: 'companyId',
  lead: 'leadId',
  deal: 'dealId',
  task: 'taskId',
};

const ENTITY_MODEL: Record<string, string> = {
  contact: 'contact',
  company: 'company',
  lead: 'lead',
  deal: 'deal',
  task: 'task',
};

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Field definitions (the customer's "columns") ────────────────────────

  async findAll(tenantId: string, query: { entityType?: string; includeInactive?: string }) {
    // entityType is optional here by design — omitting it lists custom fields
    // across every entity type, which is what the workspace-wide field admin
    // screen needs. But an entityType that IS provided must be one of the
    // four supported types, or Prisma's enum validation throws unhandled.
    if (query.entityType) this.assertEntity(query.entityType);

    const where: any = { tenantId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.includeInactive !== 'true') where.isActive = true;

    return this.prisma.customField.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { displayOrder: 'asc' }],
      include: { options: { orderBy: { displayOrder: 'asc' } }, _count: { select: { values: true } } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const field = await this.prisma.customField.findFirst({
      where: { id, tenantId },
      include: { options: { orderBy: { displayOrder: 'asc' } }, _count: { select: { values: true } } },
    });

    if (!field) throw new NotFoundException('Custom field not found');
    return field;
  }

  async create(dto: CreateCustomFieldDto, tenantId: string) {
    const fieldName = this.slugify(dto.fieldName ?? dto.label);
    if (!fieldName) throw new BadRequestException('Field name cannot be empty.');

    const clash = await this.prisma.customField.findFirst({
      where: { tenantId, entityType: dto.entityType as any, fieldName },
    });
    if (clash) {
      throw new ConflictException(`A "${dto.entityType}" field named "${fieldName}" already exists.`);
    }

    this.assertOptions(dto.fieldType, dto.options);

    const displayOrder = dto.displayOrder ?? (await this.nextOrder(tenantId, dto.entityType));

    return this.prisma.customField.create({
      data: {
        tenantId,
        entityType: dto.entityType as any,
        fieldName,
        label: dto.label,
        fieldType: dto.fieldType as any,
        required: dto.required ?? false,
        defaultValue: dto.defaultValue,
        displayOrder,
        options: dto.options?.length
          ? { createMany: { data: this.buildOptions(dto.options) } }
          : undefined,
      },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateCustomFieldDto, tenantId: string) {
    const field = await this.findOne(id, tenantId);

    const fieldType = dto.fieldType ?? field.fieldType;
    if (dto.options !== undefined) this.assertOptions(fieldType as string, dto.options);

    const fieldName = dto.fieldName ? this.slugify(dto.fieldName) : undefined;
    if (fieldName && fieldName !== field.fieldName) {
      const clash = await this.prisma.customField.findFirst({
        where: { tenantId, entityType: field.entityType, fieldName, id: { not: id } },
      });
      if (clash) throw new ConflictException(`A field named "${fieldName}" already exists.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Options are replaced wholesale — simpler than diffing and the set is tiny.
      if (dto.options !== undefined) {
        await tx.customFieldOption.deleteMany({ where: { customFieldId: id } });
        if (dto.options.length > 0) {
          await tx.customFieldOption.createMany({
            data: this.buildOptions(dto.options).map((o) => ({ ...o, customFieldId: id })),
          });
        }
      }

      return tx.customField.update({
        where: { id },
        data: {
          label: dto.label,
          fieldName,
          fieldType: dto.fieldType as any,
          required: dto.required,
          defaultValue: dto.defaultValue,
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
        },
        include: { options: { orderBy: { displayOrder: 'asc' } } },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    // Values and options cascade via the schema.
    await this.prisma.customField.delete({ where: { id } });
    return { id };
  }

  async reorder(tenantId: string, ids: string[]) {
    const fields = await this.prisma.customField.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    if (fields.length !== ids.length) throw new BadRequestException('One or more fields do not belong to this workspace.');

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.customField.update({ where: { id }, data: { displayOrder: index + 1 } }),
      ),
    );

    return { reordered: ids.length };
  }

  // ─── Values on records ───────────────────────────────────────────────────

  async getValues(entityType: string, recordId: string, tenantId: string) {
    this.assertEntity(entityType);
    await this.assertRecord(entityType, recordId, tenantId);

    return this.prisma.customFieldValue.findMany({
      where: { tenantId, entityType: entityType as any, [ENTITY_FK[entityType]]: recordId },
      include: { field: { include: { options: { orderBy: { displayOrder: 'asc' } } } } },
    });
  }

  async setValues(
    entityType: string,
    recordId: string,
    tenantId: string,
    values: Record<string, string | null>,
  ) {
    this.assertEntity(entityType);
    await this.assertRecord(entityType, recordId, tenantId);

    const fk = ENTITY_FK[entityType];
    const fieldIds = Object.keys(values ?? {});
    if (fieldIds.length === 0) return { updated: 0 };

    const fields = await this.prisma.customField.findMany({
      where: { tenantId, entityType: entityType as any, id: { in: fieldIds } },
      include: { options: true },
    });

    if (fields.length !== fieldIds.length) {
      throw new BadRequestException('One or more fields do not exist on this entity.');
    }

    // Resolved once up front (rather than re-derived per phase) so a dropdown/
    // multi_select value written by label is normalised to its canonical slug
    // exactly once, and that same canonical value is what both the pre-write
    // validation and the actual upsert use.
    const resolved: Record<string, string | null> = {};
    for (const field of fields) {
      const raw = values[field.id];
      const value = raw === null || raw === undefined || raw === '' ? null : String(raw);

      if (field.required && value === null) {
        throw new BadRequestException(`"${field.label}" is required.`);
      }
      resolved[field.id] = value === null ? null : this.resolveValue(field, value);
    }

    await this.prisma.$transaction(
      fields.map((field) => {
        const value = resolved[field.id];

        if (value === null) {
          return this.prisma.customFieldValue.deleteMany({
            where: { fieldId: field.id, [fk]: recordId },
          });
        }

        return this.prisma.customFieldValue.upsert({
          where: { [`fieldId_${fk}`]: { fieldId: field.id, [fk]: recordId } } as any,
          create: {
            tenantId,
            fieldId: field.id,
            entityType: entityType as any,
            [fk]: recordId,
            value,
          } as any,
          update: { value },
        });
      }),
    );

    return { updated: fields.length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private assertEntity(entityType: string) {
    if (!CUSTOM_FIELD_ENTITIES.includes(entityType as any)) {
      throw new BadRequestException(
        `Custom fields are supported on: ${CUSTOM_FIELD_ENTITIES.join(', ')}.`,
      );
    }
  }

  private async assertRecord(entityType: string, recordId: string, tenantId: string) {
    const model = (this.prisma as any)[ENTITY_MODEL[entityType]];
    const record = await model.findFirst({ where: { id: recordId, tenantId }, select: { id: true } });
    if (!record) throw new NotFoundException(`No ${entityType} with id ${recordId}.`);
  }

  private assertOptions(fieldType: string, options?: CustomFieldOptionDto[]) {
    if (CHOICE_FIELD_TYPES.includes(fieldType) && (!options || options.length === 0)) {
      throw new BadRequestException(`A "${fieldType}" field needs at least one option.`);
    }
  }

  /** Validates a raw incoming value and returns the canonical form to store. */
  private resolveValue(field: any, value: string): string {
    switch (field.fieldType) {
      case 'number':
      case 'currency':
      case 'percentage':
        if (Number.isNaN(Number(value))) {
          throw new BadRequestException(`"${field.label}" must be a number.`);
        }
        return value;
      case 'boolean':
        if (!['true', 'false'].includes(value.toLowerCase())) {
          throw new BadRequestException(`"${field.label}" must be true or false.`);
        }
        return value;
      case 'date':
      case 'datetime':
        if (Number.isNaN(new Date(value).getTime())) {
          throw new BadRequestException(`"${field.label}" must be a valid date.`);
        }
        return value;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new BadRequestException(`"${field.label}" must be a valid email address.`);
        }
        return value;
      case 'dropdown':
        return this.resolveOption(field, value);
      case 'multi_select':
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => this.resolveOption(field, v))
          .join(',');
      default:
        return value;
    }
  }

  /**
   * Accepts either the option's write-key `value` (slug) or its display
   * `label` (case-insensitively) and normalises to the canonical slug — so a
   * client that only ever saw the label in the UI doesn't have to look up the
   * slug separately before it can write the field.
   */
  private resolveOption(field: any, input: string): string {
    const bySlug = field.options.find((o: any) => o.value === input);
    if (bySlug) return bySlug.value;

    const byLabel = field.options.find((o: any) => o.label.toLowerCase() === input.toLowerCase());
    if (byLabel) return byLabel.value;

    const allowed = field.options.map((o: any) => o.value).join(', ');
    throw new BadRequestException(`"${field.label}" must be one of: ${allowed}.`);
  }

  private buildOptions(options: CustomFieldOptionDto[]) {
    return options.map((o, index) => ({
      label: o.label,
      value: this.slugify(o.value ?? o.label),
      color: o.color,
      displayOrder: index + 1,
    }));
  }

  private async nextOrder(tenantId: string, entityType: string) {
    const last = await this.prisma.customField.findFirst({
      where: { tenantId, entityType: entityType as any },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    return (last?.displayOrder ?? 0) + 1;
  }

  private slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }
}
