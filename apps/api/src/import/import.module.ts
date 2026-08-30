import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ContactsModule } from '../contacts/contacts.module';
import { CompaniesModule } from '../companies/companies.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [ContactsModule, CompaniesModule, LeadsModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
