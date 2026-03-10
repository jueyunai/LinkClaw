import { describe, expect, it } from 'vitest';
import {
  getMockEventRecommendations,
  getMockRecommendedGuestsForEvent,
} from '@/lib/ai/mock-recommendation';

describe('mock recommendation service', () => {
  it('returns event recommendations for guest profiles', () => {
    const recommendations = getMockEventRecommendations(
      {
        bio: '专注 AI 产品与开发者社区运营',
        industry: 'AI',
        city: 'Shanghai',
      },
      [
        {
          id: 'event-1',
          title: 'AI Builder Meetup',
          description: '面向 AI 创业者和开发者',
          target_audience: 'AI 产品经理 开发者',
          location: 'Shanghai',
          status: 'published',
        },
      ],
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      eventId: 'event-1',
    });
  });

  it('returns guest recommendations for published event context', () => {
    const recommendations = getMockRecommendedGuestsForEvent(
      {
        title: 'AI Builder Meetup',
        description: '寻找 AI 产品与开发者社区从业者',
        target_audience: 'AI 产品 开发者 社区运营',
        location: 'Shanghai',
      },
      [
        {
          id: 'guest-1',
          bio: '长期参与开发者社区活动策划',
          industry: 'AI',
          city: 'Shanghai',
        },
      ],
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      guestId: 'guest-1',
    });
  });
});
