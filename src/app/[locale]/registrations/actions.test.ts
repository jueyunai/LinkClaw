import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const getLocaleMock = vi.fn(async () => 'zh');
const getTranslationsMock = vi.fn(async () => (key: string) => key);
const getUserMock = vi.fn();
const profileSingleMock = vi.fn();
const eventSingleMock = vi.fn();
const insertMock = vi.fn();
const updateTypeEqMock = vi.fn();
const updateGuestEqMock = vi.fn(() => ({ eq: updateTypeEqMock }));
const updateIdEqMock = vi.fn(() => ({ eq: updateGuestEqMock }));
const updateMock = vi.fn(() => ({ eq: updateIdEqMock }));

const fromMock = vi.fn((table: string) => {
  if (table === 'profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: profileSingleMock })),
      })),
    };
  }

  if (table === 'events') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: eventSingleMock })),
      })),
    };
  }

  if (table === 'registrations') {
    return {
      insert: insertMock,
      update: updateMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next-intl/server', () => ({
  getLocale: getLocaleMock,
  getTranslations: getTranslationsMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  })),
}));

describe('registrations actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: { id: 'guest-1' },
      },
    });

    profileSingleMock.mockResolvedValue({
      data: { role: 'guest', hunter_level: 2 },
    });

    eventSingleMock.mockResolvedValue({
      data: { id: 'event-1', organizer_id: 'organizer-1', status: 'published', bounty_rank: 2 },
    });

    insertMock.mockResolvedValue({ error: null });
    updateTypeEqMock.mockResolvedValue({ error: null });
  });

  it('段位不足时拦截接单', async () => {
    profileSingleMock.mockResolvedValueOnce({
      data: { role: 'guest', hunter_level: 1 },
    });
    eventSingleMock.mockResolvedValueOnce({
      data: { id: 'event-1', organizer_id: 'organizer-1', status: 'published', bounty_rank: 3 },
    });

    const { applyToEvent } = await import('@/app/[locale]/registrations/actions');
    const formData = new FormData();
    formData.set('eventId', 'event-1');

    await expect(applyToEvent(formData)).rejects.toThrow(
      'REDIRECT:/zh/events/event-1?error=rankInsufficient',
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('段位足够时允许接单', async () => {
    const { applyToEvent } = await import('@/app/[locale]/registrations/actions');
    const formData = new FormData();
    formData.set('eventId', 'event-1');

    await expect(applyToEvent(formData)).rejects.toThrow(
      'REDIRECT:/zh/events/event-1?success=applied',
    );
    expect(insertMock).toHaveBeenCalledWith({
      event_id: 'event-1',
      guest_id: 'guest-1',
      type: 'applied',
      status: 'pending',
      ai_match_reason: null,
    });
  });

  it('respondToInvitation 不依赖段位字段', async () => {
    profileSingleMock.mockResolvedValueOnce({
      data: { role: 'guest' },
    });

    const { respondToInvitation } = await import('@/app/[locale]/registrations/actions');
    const formData = new FormData();
    formData.set('registrationId', 'registration-1');
    formData.set('status', 'accepted');

    await expect(respondToInvitation(formData)).rejects.toThrow(
      'REDIRECT:/zh/my-events?success=invitation_accepted',
    );
    expect(updateMock).toHaveBeenCalled();
  });
});
