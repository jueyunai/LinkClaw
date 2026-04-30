'use server';

import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email';
import { applicationAcceptedEmail, invitationReceivedEmail } from '@/lib/notifications/templates';
import type { BountyRank, Database, HunterLevel, UserRole } from '@/types/database';

async function requireOrganizer(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/my-events`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const organizerProfile = profile as { role: UserRole } | null;

  if (!organizerProfile || organizerProfile.role !== 'organizer') {
    redirect(`/${locale}`);
  }

  return { supabase, user };
}

export async function applyToEvent(formData: FormData) {
  const supabase = await createClient();
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const eventId = formData.get('eventId') as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/events/${eventId}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hunter_level')
    .eq('id', user.id)
    .single();
  const guestProfile = profile as { role: UserRole; hunter_level: HunterLevel } | null;

  if (!guestProfile || guestProfile.role !== 'guest') {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(tErrors('guestOnly'))}`);
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, status, bounty_rank')
    .eq('id', eventId)
    .single();
  const targetEvent = event as {
    id: string;
    organizer_id: string;
    status: 'draft' | 'published' | 'closed';
    bounty_rank: BountyRank;
  } | null;

  if (!targetEvent || targetEvent.status !== 'published') {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(tErrors('questNotAvailable'))}`);
  }

  if (targetEvent.organizer_id === user.id) {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(tErrors('cannotClaimOwn'))}`);
  }

  if (guestProfile.hunter_level < targetEvent.bounty_rank) {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(tErrors('rankInsufficient'))}`);
  }

  const registrationInsert: Database['public']['Tables']['registrations']['Insert'] = {
    event_id: targetEvent.id,
    guest_id: user.id,
    type: 'applied',
    status: 'pending',
    ai_match_reason: null,
  };

  const { error } = await supabase
    .from('registrations')
    .insert(registrationInsert as never);

  if (error) {
    const message =
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique')
        ? tErrors('alreadyClaimed')
        : error.message;

    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/${locale}/events/${eventId}?success=applied`);
}

export async function respondToInvitation(formData: FormData) {
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const supabase = await createClient();
  const registrationId = formData.get('registrationId') as string;
  const status = formData.get('status') as Database['public']['Tables']['registrations']['Update']['status'];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/my-events`);
  }

  if (!registrationId || !status || !['accepted', 'rejected'].includes(status)) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('invalidInvitationStatus'))}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const guestProfile = profile as { role: UserRole } | null;

  if (!guestProfile || guestProfile.role !== 'guest') {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('guestOnlyInvitation'))}`);
  }

  const { error } = await supabase
    .from('registrations')
    .update({ status } as never)
    .eq('id', registrationId)
    .eq('guest_id', user.id)
    .eq('type', 'invited');

  if (error) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/my-events?success=invitation_${status}`);
}

export async function inviteGuest(formData: FormData) {
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const { supabase, user } = await requireOrganizer(locale);
  const eventId = formData.get('eventId') as string;
  const guestId = formData.get('guestId') as string;
  const aiMatchReason = (formData.get('aiMatchReason') as string) || null;

  if (!eventId || !guestId) {
    redirect(`/${locale}/events/${eventId || ''}/manage?error=${encodeURIComponent(tErrors('invalidInviteParams'))}`);
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, status')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .single();
  const organizerEvent = event as {
    id: string;
    organizer_id: string;
    status: 'draft' | 'published' | 'closed';
  } | null;

  if (!organizerEvent) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('invitePermissionDenied'))}`);
  }

  if (organizerEvent.status !== 'published') {
    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(tErrors('invitePublishedOnly'))}`);
  }

  const registrationInsert: Database['public']['Tables']['registrations']['Insert'] = {
    event_id: organizerEvent.id,
    guest_id: guestId,
    type: 'invited',
    status: 'pending',
    ai_match_reason: aiMatchReason,
  };

  const { error } = await supabase.from('registrations').insert(registrationInsert as never);

  if (error) {
    const message =
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique')
        ? tErrors('alreadyInvited')
        : error.message;

    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(message)}`);
  }

  // Fire-and-forget: send invitation email to the guest
  void (async () => {
    try {
      const { data: guestData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', guestId)
        .single();
      const { data: guestAuth } = await supabase.auth.admin.getUserById(guestId).catch(() => ({ data: null }));
      const { data: organizerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      const guestEmail = (guestAuth as { user?: { email?: string } })?.user?.email;
      if (guestEmail && !guestEmail.includes('@oauth.linkclaw.app')) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const template = invitationReceivedEmail({
          locale,
          hunterName: (guestData as { display_name: string } | null)?.display_name ?? 'Hunter',
          questTitle: (eventData as { title: string } | null)?.title ?? '',
          commissionerName: (organizerProfile as { display_name: string } | null)?.display_name ?? 'Commissioner',
          matchReason: aiMatchReason,
          questUrl: `${appUrl}/${locale}/events/${eventId}`,
        });
        await sendEmail({ to: guestEmail, ...template });
      }
    } catch (err) {
      console.error('[Notification] Failed to send invitation email:', err);
    }
  })();

  redirect(`/${locale}/events/${eventId}/manage?success=invited`);
}

export async function respondToApplication(formData: FormData) {
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const { supabase, user } = await requireOrganizer(locale);
  const registrationId = formData.get('registrationId') as string;
  const eventId = formData.get('eventId') as string;
  const status = formData.get('status') as Database['public']['Tables']['registrations']['Update']['status'];

  if (!registrationId || !eventId || !status || !['accepted', 'rejected'].includes(status)) {
    redirect(`/${locale}/events/${eventId || ''}/manage?error=${encodeURIComponent(tErrors('invalidOperationParams'))}`);
  }

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .single();

  if (!event) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('applicationPermissionDenied'))}`);
  }

  const { error } = await supabase
    .from('registrations')
    .update({ status } as never)
    .eq('id', registrationId)
    .eq('event_id', eventId)
    .eq('type', 'applied');

  if (error) {
    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(error.message)}`);
  }

  // Fire-and-forget: send email when application is accepted
  if (status === 'accepted') {
    void (async () => {
      try {
        const { data: registration } = await supabase
          .from('registrations')
          .select('guest_id')
          .eq('id', registrationId)
          .single();
        const guestId = (registration as { guest_id: string } | null)?.guest_id;
        if (!guestId) return;

        const { data: guestData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', guestId)
          .single();
        const { data: guestAuth } = await supabase.auth.admin.getUserById(guestId).catch(() => ({ data: null }));
        const { data: eventData } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .single();

        const guestEmail = (guestAuth as { user?: { email?: string } })?.user?.email;
        if (guestEmail && !guestEmail.includes('@oauth.linkclaw.app')) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const template = applicationAcceptedEmail({
            locale,
            hunterName: (guestData as { display_name: string } | null)?.display_name ?? 'Hunter',
            questTitle: (eventData as { title: string } | null)?.title ?? '',
            questUrl: `${appUrl}/${locale}/events/${eventId}`,
          });
          await sendEmail({ to: guestEmail, ...template });
        }
      } catch (err) {
        console.error('[Notification] Failed to send acceptance email:', err);
      }
    })();
  }

  const success = status === 'accepted' ? 'application_accepted' : 'application_rejected';
  redirect(`/${locale}/events/${eventId}/manage?success=${success}`);
}
