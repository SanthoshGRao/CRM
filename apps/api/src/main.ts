import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);

  // ── Cookie support ──────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: configService.get<string>('COOKIE_SECRET'),
  });

  // ── Global prefix ───────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── CORS ────────────────────────────────────────────────────
  // Comma-separated so the same deployment can serve localhost, 127.0.0.1 and a
  // LAN address. An origin missing from this list fails every request — cookies
  // included — which looks exactly like being signed out.
  const allowedOrigins = (configService.get<string>('FRONTEND_URL') || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  });

  // ── Swagger ─────────────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CRM Platform API')
      .setDescription('Multi-tenant CRM Platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('tenants', 'Tenant management')
      .addTag('contacts', 'Contact management')
      .addTag('companies', 'Company management')
      .addTag('leads', 'Lead management')
      .addTag('deals', 'Deal management')
      .addTag('pipelines', 'Pipeline management')
      .addTag('tasks', 'Task management')
      .addTag('activities', 'Activity timeline')
      .addTag('custom-fields', 'Custom field engine')
      .addTag('workflows', 'Workflow automation')
      .addTag('dashboard', 'Dashboard data')
      .addTag('reports', 'Report engine')
      .addTag('audit', 'Audit logs')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs available at http://localhost:${configService.get('PORT')}/api/docs`);
  }

  // ── Start ───────────────────────────────────────────────────
  const port = configService.get<number>('PORT') || 4000;
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
  logger.log(`🚀 CRM API running on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
