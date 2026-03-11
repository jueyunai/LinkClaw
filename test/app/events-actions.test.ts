import { describe, expect, it, vi, beforeEach } from 'vitest';

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const getLocaleMock = vi.fn(async () => 'zh');
const getUserMock = vi.fn();
const profileSingleMock = vi.fn();
const eventInsertSingleMock = vi.fn();
const eventInsertSelectMock = vi.fn(() => ({ single: eventInsertSingleMock }));
const eventInsertMock = vi.fn(() => ({ select: eventInsertSelectMock }));
const eventUpdateEqOrganizerMock = vi.fn();
const eventUpdateEqIdMock = vi.fn(() => ({ eq: eventUpdateEqOrganizerMock }));
const eventUpdateMock = vi.fn(() => ({ eq: eventUpdateEqIdMock }));
const profilesEqMock = vi.fn(() => ({ single: profileSingleMock }));
const profilesSelectMock = vi.fn(() => ({ eq: profilesEqMock }));
const eventsSelectMock = vi.fn(() => ({ single: eventInsertSingleMock }));
const fromMock = vi.fn((table: string) => {
  if (table === 'profiles') {
    return { select: profilesSelectMock };
  }

  if (table === 'events') {
    return {
      insert: eventInsertMock,
      update: eventUpdateMock,
      select: eventsSelectMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next-intl/server', () => ({
  getLocale: getLocaleMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  })),
}));

describe('events actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    });

    profileSingleMock.mockResolvedValue({
      data: { role: 'organizer' },
    });

    eventInsertSingleMock.mockResolvedValue({
      data: { id: 'event-1' },
      error: null,
    });

    eventUpdateEqOrganizerMock.mockResolvedValue({
      error: null,
    });
  });

  it('创建活动时可保存为草稿并跳转到管理页', async () => {
    const { createEvent } = await import('@/app/[locale]/events/actions');
    const formData = new FormData();
    formData.set('title', '测试活动');
    formData.set('description', '活动描述');
    formData.set('targetAudience', 'AI 创业者');
    formData.set('eventDate', '2026-03-11T15:04');
    formData.set('location', '深圳');
    formData.set('maxGuests', '20');
    formData.set('intent', 'draft');

    await expect(createEvent(formData)).rejects.toThrow('REDIRECT:/zh/events/event-1/manage?success=draft_saved');
    expect(eventInsertMock).toHaveBeenCalledTimes(1);
    expect(eventInsertMock.mock.calls[0][0]).toMatchObject({
      status: 'draft',
      title: '测试活动',
      location: '深圳',
      max_guests: 20,
    });
  });

  it('创建活动时可直接发布', async () => {
    const { createEvent } = await import('@/app/[locale]/events/actions');
    const formData = new FormData();
    formData.set('title', '测试活动');
    formData.set('description', '活动描述');
    formData.set('eventDate', '2026-03-11T15:04');
    formData.set('location', '深圳');
    formData.set('maxGuests', '20');
    formData.set('intent', 'publish');

    await expect(createEvent(formData)).rejects.toThrow('REDIRECT:/zh/events/event-1/manage?success=published');
    expect(eventInsertMock.mock.calls[0][0]).toMatchObject({ status: 'published' });
  });

  it('更新活动时只修改内容并回到管理页', async () => {
    const { updateEvent } = await import('@/app/[locale]/events/actions');
    const formData = new FormData();
    formData.set('eventId', 'event-1');
    formData.set('title', '更新后的活动');
    formData.set('description', '新描述');
    formData.set('targetAudience', '投资人');
    formData.set('eventDate', '2026-03-12T10:00');
    formData.set('location', '广州');
    formData.set('maxGuests', '50');

    await expect(updateEvent(formData)).rejects.toThrow('REDIRECT:/zh/events/event-1/manage?success=updated');
    expect(eventUpdateMock).toHaveBeenCalledTimes(1);
    expect(eventUpdateMock.mock.calls[0][0]).toMatchObject({
      title: '更新后的活动',
      description: '新描述',
      location: '广州',
      max_guests: 50,
    });
    expect(eventUpdateMock.mock.calls[0][0]).not.toHaveProperty('status');
  });

  it('更新活动状态时可回到管理页并返回下架提示', async () => {
    const { updateEventStatus } = await import('@/app/[locale]/events/actions');
    const formData = new FormData();
    formData.set('eventId', 'event-1');
    formData.set('status', 'closed');
    formData.set('returnTo', 'manage');

    await expect(updateEventStatus(formData)).rejects.toThrow('REDIRECT:/zh/events/event-1/manage?success=closed');
    expect(eventUpdateMock.mock.calls[0][0]).toMatchObject({ status: 'closed' });
  });
});
