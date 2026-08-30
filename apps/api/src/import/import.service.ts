import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaService } from '../common/prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { CompaniesService } from '../companies/companies.service';
import { LeadsService } from '../leads/leads.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // matches the storage module's cap
const MAX_ROWS = 2000;
const ALLOWED_EXT = ['.xlsx', '.xls', '.csv'];

const LEAD_SOURCES = ['website', 'referral', 'cold_call', 'email', 'social', 'advertisement', 'event', 'other'];

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  failed: number;
  errors: ImportRowError[];
}

/**
 * Parses an uploaded spreadsheet and replays each row through the same
 * service `.create()` methods a manual form submission uses — so an import
 * triggers the same activity logging and workflow automation a normal create
 * does, and never has to duplicate that business logic.
 */
@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactsService: ContactsService,
    private readonly companiesService: CompaniesService,
    private readonly leadsService: LeadsService,
  ) {}

  async importContacts(
    tenantId: string,
    userId: string,
    originalFilename: string,
    contentBase64: string,
  ): Promise<ImportResult> {
    const rows = this.parseRows(originalFilename, contentBase64);
    const ownerByEmail = await this.buildUserEmailMap(tenantId);
    const companyByName = await this.buildCompanyNameMap(tenantId);

    const errors: ImportRowError[] = [];
    let created = 0;

    for (const { row, rowNumber } of rows) {
      try {
        const firstName = this.str(row, 'First Name', 'FirstName');
        const lastName = this.str(row, 'Last Name', 'LastName');
        if (!firstName || !lastName) throw new Error('First Name and Last Name are required.');

        const companyName = this.str(row, 'Company');
        const ownerEmail = this.str(row, 'Owner Email', 'Owner');

        const dto: any = {
          firstName,
          lastName,
          email: this.str(row, 'Email') || undefined,
          phone: this.str(row, 'Phone') || undefined,
          mobile: this.str(row, 'Mobile') || undefined,
          companyId: companyName
            ? await this.resolveOrCreateCompany(tenantId, userId, companyName, companyByName)
            : undefined,
          ownerId: ownerEmail ? this.resolveOwner(ownerEmail, ownerByEmail) : undefined,
        };

        await this.contactsService.create(dto, tenantId, userId);
        created++;
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err?.message || 'Could not import this row.' });
      }
    }

    return { totalRows: rows.length, created, failed: errors.length, errors };
  }

  async importCompanies(
    tenantId: string,
    userId: string,
    originalFilename: string,
    contentBase64: string,
  ): Promise<ImportResult> {
    const rows = this.parseRows(originalFilename, contentBase64);
    const ownerByEmail = await this.buildUserEmailMap(tenantId);

    const errors: ImportRowError[] = [];
    let created = 0;

    for (const { row, rowNumber } of rows) {
      try {
        const name = this.str(row, 'Name');
        if (!name) throw new Error('Name is required.');

        const ownerEmail = this.str(row, 'Owner Email', 'Owner');

        const dto: any = {
          name,
          industry: this.str(row, 'Industry') || undefined,
          website: this.str(row, 'Website') || undefined,
          phone: this.str(row, 'Phone') || undefined,
          email: this.str(row, 'Email') || undefined,
          address: this.str(row, 'Address') || undefined,
          city: this.str(row, 'City') || undefined,
          state: this.str(row, 'State') || undefined,
          country: this.str(row, 'Country') || undefined,
          postalCode: this.str(row, 'Postal Code', 'PostalCode', 'Zip') || undefined,
          employees: this.numField(row, 'Employees'),
          annualRevenue: this.numField(row, 'Annual Revenue', 'AnnualRevenue'),
          ownerId: ownerEmail ? this.resolveOwner(ownerEmail, ownerByEmail) : undefined,
        };

        await this.companiesService.create(dto, tenantId, userId);
        created++;
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err?.message || 'Could not import this row.' });
      }
    }

    return { totalRows: rows.length, created, failed: errors.length, errors };
  }

  async importLeads(
    tenantId: string,
    userId: string,
    originalFilename: string,
    contentBase64: string,
    pipelineId: string,
    defaultStageId: string,
  ): Promise<ImportResult> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      include: { stages: true },
    });
    if (!pipeline) throw new BadRequestException('Pipeline not found.');
    if (!pipeline.stages.some((s) => s.id === defaultStageId)) {
      throw new BadRequestException('Stage not found in this pipeline.');
    }
    const stageByName = new Map(pipeline.stages.map((s) => [s.name.trim().toLowerCase(), s.id]));

    const rows = this.parseRows(originalFilename, contentBase64);
    const ownerByEmail = await this.buildUserEmailMap(tenantId);
    const companyByName = await this.buildCompanyNameMap(tenantId);
    const contactByEmail = await this.buildContactEmailMap(tenantId);

    const errors: ImportRowError[] = [];
    let created = 0;

    for (const { row, rowNumber } of rows) {
      try {
        const title = this.str(row, 'Title');
        if (!title) throw new Error('Title is required.');

        const stageName = this.str(row, 'Stage');
        let stageId = defaultStageId;
        if (stageName) {
          const matched = stageByName.get(stageName.toLowerCase());
          if (!matched) throw new Error(`Stage "${stageName}" does not exist in the "${pipeline.name}" pipeline.`);
          stageId = matched;
        }

        const sourceRaw = this.str(row, 'Source');
        const source = sourceRaw ? sourceRaw.toLowerCase().replace(/\s+/g, '_') : undefined;
        if (source && !LEAD_SOURCES.includes(source)) {
          throw new Error(`Source "${sourceRaw}" is not valid. Use one of: ${LEAD_SOURCES.join(', ')}.`);
        }

        const companyName = this.str(row, 'Company');
        const contactEmail = this.str(row, 'Contact Email');
        const ownerEmail = this.str(row, 'Owner Email', 'Owner');

        const dto: any = {
          title,
          pipelineId,
          stageId,
          value: this.numField(row, 'Value'),
          probability: this.numField(row, 'Probability'),
          source,
          expectedCloseDate: this.dateField(row, 'Expected Close Date', 'ExpectedCloseDate'),
          companyId: companyName
            ? await this.resolveOrCreateCompany(tenantId, userId, companyName, companyByName)
            : undefined,
          contactId: contactEmail ? contactByEmail.get(contactEmail.toLowerCase()) : undefined,
          ownerId: ownerEmail ? this.resolveOwner(ownerEmail, ownerByEmail) : undefined,
        };

        await this.leadsService.create(dto, tenantId, userId);
        created++;
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err?.message || 'Could not import this row.' });
      }
    }

    return { totalRows: rows.length, created, failed: errors.length, errors };
  }

  // ─── Templates ─────────────────────────────────────────────────────────────

  contactsTemplate(): Buffer {
    return this.buildTemplate(
      ['First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Company', 'Owner Email'],
      ['Priya', 'Sharma', 'priya@example.com', '9876543210', '', 'Acme Corp', ''],
    );
  }

  companiesTemplate(): Buffer {
    return this.buildTemplate(
      [
        'Name', 'Industry', 'Website', 'Phone', 'Email', 'Address', 'City',
        'State', 'Country', 'Postal Code', 'Employees', 'Annual Revenue', 'Owner Email',
      ],
      [
        'Acme Corp', 'Manufacturing', 'https://acme.example.com', '9876543210',
        'info@acme.example.com', '', 'Mumbai', 'Maharashtra', 'India', '400001', 50, 5000000, '',
      ],
    );
  }

  leadsTemplate(): Buffer {
    return this.buildTemplate(
      ['Title', 'Stage', 'Value', 'Probability', 'Source', 'Expected Close Date', 'Company', 'Contact Email', 'Owner Email'],
      ['Acme Corp - New Inquiry', '', 250000, 30, 'website', '', 'Acme Corp', '', ''],
    );
  }

  private buildTemplate(headers: string[], exampleRow: Array<string | number>): Buffer {
    const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // ─── Parsing ───────────────────────────────────────────────────────────────

  private parseRows(
    originalFilename: string,
    contentBase64: string,
  ): Array<{ row: Record<string, any>; rowNumber: number }> {
    const ext = path.extname(originalFilename).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw new BadRequestException(`File extension "${ext}" is not permitted. Use .xlsx, .xls, or .csv.`);
    }

    const clean = contentBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    if (buffer.length === 0) throw new BadRequestException('The file is empty.');
    if (buffer.length > MAX_FILE_SIZE) throw new BadRequestException('File size exceeds 10MB limit.');

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Could not read this file. Make sure it is a valid .xlsx, .xls, or .csv file.');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('The file has no sheets.');

    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: true });

    // Row 1 is the header, so the first data row is spreadsheet row 2.
    const rows = raw
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== ''));

    if (rows.length === 0) throw new BadRequestException('No rows found below the header row.');
    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(`This file has ${rows.length} rows. Split it into batches of ${MAX_ROWS} or fewer.`);
    }

    return rows;
  }

  /** Header lookup is case-insensitive and whitespace-tolerant, first match wins. */
  private cell(row: Record<string, any>, ...headers: string[]): any {
    const wanted = new Set(headers.map((h) => h.toLowerCase()));
    for (const key of Object.keys(row)) {
      if (wanted.has(key.trim().toLowerCase())) return row[key];
    }
    return undefined;
  }

  private str(row: Record<string, any>, ...headers: string[]): string {
    const v = this.cell(row, ...headers);
    if (v === undefined || v === null) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).trim();
  }

  private numField(row: Record<string, any>, ...headers: string[]): number | undefined {
    const v = this.cell(row, ...headers);
    if (v === undefined || v === null || v === '') return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  private dateField(row: Record<string, any>, ...headers: string[]): string | undefined {
    const v = this.cell(row, ...headers);
    if (v === undefined || v === null || v === '') return undefined;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const parsed = new Date(String(v));
    if (Number.isNaN(parsed.getTime())) throw new Error(`"${v}" is not a valid date.`);
    return parsed.toISOString().slice(0, 10);
  }

  // ─── Lookups ───────────────────────────────────────────────────────────────

  private async buildUserEmailMap(tenantId: string): Promise<Map<string, string>> {
    const users = await this.prisma.user.findMany({ where: { tenantId }, select: { id: true, email: true } });
    return new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  }

  private resolveOwner(email: string, byEmail: Map<string, string>): string {
    const id = byEmail.get(email.toLowerCase());
    if (!id) throw new Error(`No team member found with email "${email}".`);
    return id;
  }

  private async buildCompanyNameMap(tenantId: string): Promise<Map<string, string>> {
    const companies = await this.prisma.company.findMany({ where: { tenantId }, select: { id: true, name: true } });
    return new Map(companies.map((c) => [c.name.trim().toLowerCase(), c.id]));
  }

  /** Creates the company on first mention so later rows (and later imports) reuse it instead of duplicating. */
  private async resolveOrCreateCompany(
    tenantId: string,
    userId: string,
    name: string,
    byName: Map<string, string>,
  ): Promise<string> {
    const key = name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) return existing;

    const created = await this.companiesService.create({ name: name.trim() } as any, tenantId, userId);
    byName.set(key, created.id);
    return created.id;
  }

  private async buildContactEmailMap(tenantId: string): Promise<Map<string, string>> {
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId, email: { not: null } },
      select: { id: true, email: true },
    });
    return new Map(contacts.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]));
  }
}
