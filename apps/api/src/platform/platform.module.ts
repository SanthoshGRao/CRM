import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminTenantsService } from './admin-tenants.service';
import { PlatformJwtGuard } from './guards/platform-jwt.guard';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    RolesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.platformSecret'),
      }),
    }),
  ],
  controllers: [PlatformAuthController, AdminTenantsController],
  providers: [PlatformAuthService, AdminTenantsService, PlatformJwtGuard],
  exports: [PlatformAuthService, AdminTenantsService],
})
export class PlatformModule {}
