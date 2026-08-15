import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { AdminLoginDto } from './dto/platform-auth.dto';
import { PLATFORM_TOKEN_TYPE } from './guards/platform-jwt.guard';

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!admin) throw new UnauthorizedException('Invalid email or password.');
    if (admin.status !== 'active') throw new UnauthorizedException('This admin account is suspended.');

    const valid = await argon2.verify(admin.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: admin.id, email: admin.email, typ: PLATFORM_TOKEN_TYPE },
      {
        secret: this.config.get<string>('app.jwt.platformSecret'),
        expiresIn: (this.config.get<string>('app.jwt.platformExpiresIn') || '8h') as any,
      },
    );

    this.logger.log(`Platform admin signed in: ${admin.email}`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  async me(adminId: string) {
    return this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        status: true, lastLoginAt: true, createdAt: true,
      },
    });
  }
}
