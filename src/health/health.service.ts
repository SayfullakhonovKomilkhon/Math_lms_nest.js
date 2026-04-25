import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: parseInt(
        this.configService.get<string>('REDIS_PORT') || '6379',
        10,
      ),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async getStatus() {
    let database: 'connected' | 'disconnected' = 'disconnected';
    let redis: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
      redis = 'connected';
    } catch {
      redis = 'disconnected';
    }

    return {
      status:
        database === 'connected' && redis === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
      redis,
      version: '1.0.0',
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
