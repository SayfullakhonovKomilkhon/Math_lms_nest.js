import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { normalizePhone } from '../utils/phone';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  @Inject(ConfigService) private readonly config: ConfigService;
  private readonly jwt = new JwtService();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);
    if (req.method === 'POST' && req.path === '/auth/login') {
      // Secondary ceiling prevents rotating login names from bypassing protection.
      const key = createHash('sha256')
        .update(`login-ip:${req.ip}`)
        .digest('hex');
      const hit = await this.storageService.increment(
        key,
        60_000,
        120,
        60_000,
        'login-ip',
      );
      if (hit.isBlocked) {
        res.header('Retry-After', hit.timeToBlockExpire);
        throw new ThrottlerException();
      }
    }
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    if (req.method === 'POST' && req.path === '/auth/login') {
      const phone =
        typeof req.body?.phone === 'string'
          ? normalizePhone(req.body.phone.slice(0, 100))
          : '';
      return `login:${ip}:${phone}`;
    }
    // The global guard runs before JwtAuthGuard: never trust an unverified sub.
    const refresh = req.method === 'POST' && req.path === '/auth/refresh';
    const token = refresh
      ? req.body?.refreshToken
      : req.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (typeof token === 'string' && token.length < 8192) {
      try {
        const payload = await this.jwt.verifyAsync(token, {
          secret: this.config.get<string>(
            refresh ? 'jwt.refreshSecret' : 'jwt.accessSecret',
          ),
          algorithms: ['HS256'],
        });
        if (typeof payload.sub === 'string') return `user:${payload.sub}`;
      } catch {
        /* Invalid tokens share the IP limit, not an attacker-chosen identity. */
      }
    }
    return `ip:${ip}`;
  }
}
