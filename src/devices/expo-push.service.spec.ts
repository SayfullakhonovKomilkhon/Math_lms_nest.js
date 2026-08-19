import { ExpoPushService } from './expo-push.service';

describe('ExpoPushService', () => {
  const prisma = {
    devicePushToken: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const receiptsQueue = { add: jest.fn() };
  const deliveryQueue = { add: jest.fn() };
  let service: ExpoPushService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpoPushService(
      prisma as never,
      receiptsQueue as never,
      deliveryQueue as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deduplicates devices, selects a channel and queues receipt checks', async () => {
    prisma.devicePushToken.findMany.mockResolvedValue([
      { token: 'ExpoPushToken[token-1]' },
      { token: 'ExpoPushToken[token-1]' },
    ]);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: [{ status: 'ok', id: 'receipt-1' }] }),
    } as Response);

    await service.deliverToUsers(
      ['user-1', 'user-1'],
      'Оплата',
      '<b>Напоминание</b>',
      { screen: 'payment' },
    );

    const request = fetchSpy.mock.calls[0][1];
    expect(typeof request?.body).toBe('string');
    const messages = JSON.parse(request?.body as string) as Array<{
      body: string;
      channelId: string;
    }>;
    expect(messages).toEqual([
      expect.objectContaining({
        body: 'Напоминание',
        channelId: 'payments',
      }),
    ]);
    expect(receiptsQueue.add).toHaveBeenCalledWith(
      'check',
      { receipts: [{ id: 'receipt-1', token: 'ExpoPushToken[token-1]' }] },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('deactivates tokens rejected immediately by Expo', async () => {
    prisma.devicePushToken.findMany.mockResolvedValue([
      { token: 'ExpoPushToken[old-token]' },
    ]);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              status: 'error',
              message: 'Device is not registered',
              details: { error: 'DeviceNotRegistered' },
            },
          ],
        }),
    } as Response);

    await service.deliverToUsers(['user-1'], 'Тест', 'Сообщение');

    expect(prisma.devicePushToken.updateMany).toHaveBeenCalledWith({
      where: { token: { in: ['ExpoPushToken[old-token]'] } },
      data: { isActive: false },
    });
    expect(receiptsQueue.add).not.toHaveBeenCalled();
  });

  it('queues delivery with exponential retries', async () => {
    await service.sendToUsers(['user-1', 'user-1'], 'Заголовок', 'Сообщение', {
      screen: 'homework',
    });

    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      {
        userIds: ['user-1'],
        title: 'Заголовок',
        body: 'Сообщение',
        data: { screen: 'homework' },
      },
      expect.objectContaining({
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
      }),
    );
  });

  it('throws on transient Expo HTTP errors so BullMQ retries', async () => {
    prisma.devicePushToken.findMany.mockResolvedValue([
      { token: 'ExpoPushToken[token-1]' },
    ]);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(
      service.deliverToUsers(['user-1'], 'Тест', 'Сообщение'),
    ).rejects.toThrow('Expo push responded with 503');
  });
});
