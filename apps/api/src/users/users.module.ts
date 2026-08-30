import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersDataController } from './users-data.controller';
import { UsersService } from './users.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [UsersController, UsersDataController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
