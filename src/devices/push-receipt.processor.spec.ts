import { PushReceiptProcessor } from './push-receipt.processor';

describe('PushReceiptProcessor', () => {
  const prisma = { devicePushToken: { updateMany: jest.fn() } };
  const job = {
    name: 'check',
    data: {
      receipts: [{ id: 'receipt-1', token: 'ExpoPushToken[expired-token]' }],
    },
  };

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('deactivates a token rejected in an Expo receipt', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            'receipt-1': {
              status: 'error',
              details: { error: 'DeviceNotRegistered' },
            },
          },
        }),
    } as Response);
    const processor = new PushReceiptProcessor(prisma as never);

    await processor.process(job as never);

    expect(prisma.devicePushToken.updateMany).toHaveBeenCalledWith({
      where: { token: { in: ['ExpoPushToken[expired-token]'] } },
      data: { isActive: false },
    });
  });

  it('retries while receipts are not ready', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    } as Response);
    const processor = new PushReceiptProcessor(prisma as never);

    await expect(processor.process(job as never)).rejects.toThrow(
      'Expo receipts are not ready yet',
    );
  });
});
