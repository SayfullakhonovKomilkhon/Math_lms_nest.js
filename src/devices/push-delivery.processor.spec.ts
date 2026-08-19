import { PushDeliveryProcessor } from './push-delivery.processor';

describe('PushDeliveryProcessor', () => {
  it('delivers a queued push job', async () => {
    const expoPush = { deliverToUsers: jest.fn().mockResolvedValue(undefined) };
    const processor = new PushDeliveryProcessor(expoPush as never);

    await processor.process({
      name: 'deliver',
      data: {
        userIds: ['user-1'],
        title: 'KhanovMath',
        body: 'Сообщение',
        data: { screen: 'grades' },
      },
    } as never);

    expect(expoPush.deliverToUsers).toHaveBeenCalledWith(
      ['user-1'],
      'KhanovMath',
      'Сообщение',
      { screen: 'grades' },
    );
  });
});
