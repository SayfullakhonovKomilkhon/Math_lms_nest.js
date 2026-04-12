import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@mathcenter.uz', password: 'Admin123!' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    });

    it('should return 401 for invalid password', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@mathcenter.uz', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'notanemail', password: 'Admin123!' });

      expect(res.status).toBe(400);
    });
  });

  describe('RBAC', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@mathcenter.uz', password: 'Admin123!' });
      accessToken = res.body.data?.accessToken;
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await supertest(app.getHttpServer()).get('/students');
      expect(res.status).toBe(401);
    });

    it('should return students list for authenticated SUPER_ADMIN', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });
});
