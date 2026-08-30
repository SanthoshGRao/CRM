import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { Readable } from 'stream';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Base64-encoded file uploads (avatars, spreadsheet imports) inflate ~33% over
    // the raw file size, so the body limit needs headroom above the 10MB file cap
    // those endpoints enforce themselves.
    new FastifyAdapter({ logger: false, bodyLimit: 15 * 1024 * 1024 }),
  );

  const configService = app.get(ConfigService);

  // ── Cookie support ──────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: configService.get<string>('COOKIE_SECRET'),
  });

  // ── Raw body for the Razorpay webhook ─────────────────────────
  // Scoped to just that route via a preParsing hook (rather than the
  // fastify-raw-body plugin, whose global content-type parser collides with
  // the one Nest's FastifyAdapter registers itself) so HMAC verification can
  // hash Razorpay's exact bytes without disturbing JSON parsing elsewhere.
  app.getHttpAdapter().getInstance().addHook('preParsing', async (request: any, _reply: any, payload: any) => {
    if (!request.url.startsWith('/api/v1/billing/webhook')) return payload;

    const chunks: Buffer[] = [];
    for await (const chunk of payload) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    request.rawBody = raw;
    return Readable.from(raw);
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
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
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
      .addTag('import', 'Bulk spreadsheet import')
      .addTag('workflows', 'Workflow automation')
      .addTag('dashboard', 'Dashboard data')
      .addTag('reports', 'Report engine')
      .addTag('audit', 'Audit logs')
      .addTag('data-api', 'API-key-authenticated data API for customer integrations')
      .addTag('api-keys', 'API key management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs available at http://localhost:${configService.get('PORT')}/api/docs`);
  }

  // ── Start ───────────────────────────────────────────────────
  const port = configService.get<number>('PORT') || 4001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  logger.log(`🚀 CRM API running on http://0.0.0.0:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
