import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Production API is reachable only through the single Caddy Docker proxy.
  // Caddy overwrites X-Forwarded-For; direct deployments leave this disabled.
  app.set('trust proxy', process.env.TRUST_PROXY_HOPS === '1' ? 1 : false);
  app.useLogger(['error', 'warn', 'log']);

  // CORS: read allowed origins from FRONTEND_URL env (comma-separated for
  // multiple). When unset, fall back to reflecting the request origin so
  // local dev and preview deploys keep working without extra config.
  const allowedOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: [
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KhanovMath Academy CRM API')
    .setDescription('API для системы управления учебным центром по математике')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Авторизация')
    .addTag('students', 'Ученики')
    .addTag('teachers', 'Учителя')
    .addTag('groups', 'Группы')
    .addTag('parents', 'Родители')
    .addTag('users', 'Пользователи')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
