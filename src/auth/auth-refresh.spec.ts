import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Refresh token concurrency', () => {
  const jwt = new JwtService();
  const config = new ConfigService({
    jwt: { accessSecret: 'access', refreshSecret: 'refresh' },
  });
  const user = {
    id: 'u1',
    phone: '+998900000000',
    role: 'STUDENT',
    isActive: true,
  };
  const token = () =>
    jwt.sign({ sub: user.id }, { secret: 'refresh', expiresIn: '1h' });
  function fixture(count = 1) {
    const create = jest.fn().mockResolvedValue({});
    const remove = jest.fn().mockResolvedValue({ count });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          userId: user.id,
          expiresAt: new Date(Date.now() + 60000),
        }),
      },
      $transaction: jest.fn(async (fn) =>
        fn({ refreshToken: { create, deleteMany: remove } }),
      ),
    };
    return {
      service: new AuthService(prisma as any, jwt, config),
      prisma,
      create,
      remove,
    };
  }
  it('coalesces 30 simultaneous refreshes into one atomic rotation', async () => {
    const f = fixture();
    const old = token();
    const results = await Promise.all(
      Array.from({ length: 30 }, () => f.service.refresh(user.id, old)),
    );
    expect(new Set(results.map((r) => r.refreshToken)).size).toBe(1);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(results[0].refreshToken).not.toBe(old);
    expect(
      jwt.verify(results[0].refreshToken, { secret: 'refresh' }).jti,
    ).toBeTruthy();
  });
  it('returns 401 instead of a database error if another process consumed the token', async () => {
    const f = fixture(0);
    await expect(f.service.refresh(user.id, token())).rejects.toMatchObject({
      status: 401,
    });
    expect(f.create).not.toHaveBeenCalled();
  });
  it('rejects forged refresh tokens before database access', async () => {
    const f = fixture();
    await expect(
      f.service.refresh(
        user.id,
        jwt.sign({ sub: user.id }, { secret: 'wrong' }),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(f.prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});
