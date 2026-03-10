'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Database, RegistrationStatus, UserRole } from '@/types/database';

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
  const eventId = formData.get('eventId') as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/events/${eventId}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const guestProfile = profile as { role: UserRole } | null;

  if (!guestProfile || guestProfile.role !== 'guest') {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent('只有嘉宾可以报名活动')}`);
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, status')
    .eq('id', eventId)
    .single();
  const targetEvent = event as {
    id: string;
    organizer_id: string;
    status: 'draft' | 'published' | 'closed';
  } | null;

  if (!targetEvent || targetEvent.status !== 'published') {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent('当前活动暂不接受报名')}`);
  }

  if (targetEvent.organizer_id === user.id) {
    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent('不能报名自己发布的活动')}`);
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
        ? '你已经报名过该活动'
        : error.message;

    redirect(`/${locale}/events/${eventId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/${locale}/events/${eventId}?success=applied`);
}

export async function respondToInvitation(formData: FormData) {
  const locale = await getLocale();
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
    redirect(`/${locale}/my-events?error=${encodeURIComponent('邀请状态无效')}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const guestProfile = profile as { role: UserRole } | null;

  if (!guestProfile || guestProfile.role !== 'guest') {
    redirect(`/${locale}/my-events?error=${encodeURIComponent('只有嘉宾可以处理邀请')}`);
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
  const { supabase, user } = await requireOrganizer(locale);
  const eventId = formData.get('eventId') as string;
  const guestId = formData.get('guestId') as string;
  const aiMatchReason = (formData.get('aiMatchReason') as string) || null;

  if (!eventId || !guestId) {
    redirect(`/${locale}/events/${eventId || ''}/manage?error=${encodeURIComponent('邀请参数无效')}`);
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
    redirect(`/${locale}/my-events?error=${encodeURIComponent('无权邀请该活动嘉宾')}`);
  }

  if (organizerEvent.status !== 'published') {
    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent('只有已发布活动可以邀请嘉宾')}`);
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
        ? '该嘉宾已在活动名单中'
        : error.message;

    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(message)}`);
  }

  redirect(`/${locale}/events/${eventId}/manage?success=invited`);
}
