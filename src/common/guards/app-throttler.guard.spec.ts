import { Controller, Get, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AppThrottlerGuard } from './app-throttler.guard';

@Controller('auth')
class ProbeController {
  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) login() {
    return {};
  }
  @Get('probe') @Throttle({ default: { limit: 2, ttl: 60000 } }) probe() {
    return {};
  }
}

describe('Production rate-limit isolation', () => {
  let app: NestExpressApplication;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => ({ jwt: { accessSecret: 'test-secret' } })],
        }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
      ],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    await app.listen(0, '127.0.0.1');
  });
  afterEach(async () => {
    await app.close();
  });
  it('allows 30 distinct logins on one Wi-Fi and blocks the sixth attempt for one login', async () => {
    const responses = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', '198.51.100.1')
          .send({ phone: `+99890${String(i).padStart(7, '0')}` }),
      ),
    );
    expect(responses.every((r) => r.status === 201)).toBe(true);
    for (let i = 0; i < 4; i++)
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', '198.51.100.1')
        .send({ phone: '900000000' })
        .expect(201);
    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '198.51.100.1')
      .send({ phone: '+998 90 000 00 00' })
      .expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '203.0.113.2')
      .send({ phone: '900000000' })
      .expect(201);
  });
  it('separates verified users and counts a request only once', async () => {
    const jwt = new JwtService({ secret: 'test-secret' });
    const a = jwt.sign({ sub: 'a' });
    const b = jwt.sign({ sub: 'b' });
    for (const token of [a, a, b, b])
      await request(app.getHttpServer())
        .get('/auth/probe')
        .auth(token, { type: 'bearer' })
        .expect(200);
    await request(app.getHttpServer())
      .get('/auth/probe')
      .auth(a, { type: 'bearer' })
      .expect(429);
  });
  it('does not trust forged JWT subjects', async () => {
    const jwt = new JwtService({ secret: 'wrong-secret' });
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .get('/auth/probe')
        .auth(jwt.sign({ sub: String(i) }), { type: 'bearer' })
        .expect(200);
    await request(app.getHttpServer())
      .get('/auth/probe')
      .auth(jwt.sign({ sub: 'third' }), { type: 'bearer' })
      .expect(429);
  });
});
