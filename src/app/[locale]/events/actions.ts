'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { Database, EventStatus, UserRole } from '@/types/database';

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

export async function createEvent(formData: FormData) {
  const locale = await getLocale();
  const { supabase, user } = await requireOrganizer(locale);

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const targetAudience = (formData.get('targetAudience') as string)?.trim();
  const eventDate = formData.get('eventDate') as string;
  const location = (formData.get('location') as string)?.trim();
  const maxGuests = Number(formData.get('maxGuests'));
  const status = formData.get('status') as EventStatus;

  if (!title || !description || !eventDate || !location || !Number.isFinite(maxGuests)) {
    redirect(`/${locale}/events/new?error=${encodeURIComponent('请完整填写活动信息')}`);
  }

  if (maxGuests <= 0) {
    redirect(`/${locale}/events/new?error=${encodeURIComponent('人数上限必须大于 0')}`);
  }

  const eventInsert: Database['public']['Tables']['events']['Insert'] = {
    organizer_id: user.id,
    title,
    description,
    target_audience: targetAudience || null,
    event_date: new Date(eventDate).toISOString(),
    location,
    max_guests: maxGuests,
    status: status ?? 'draft',
  };

  const { data, error } = await supabase
    .from('events')
    .insert(eventInsert as never)
    .select('id')
    .single();
  const createdEvent = data as { id: string } | null;

  if (error || !createdEvent) {
    redirect(
      `/${locale}/events/new?error=${encodeURIComponent(error?.message ?? '活动创建失败')}`,
    );
  }

  redirect(`/${locale}/events/${createdEvent.id}?success=created`);
}

export async function updateEventStatus(formData: FormData) {
  const locale = await getLocale();
  const { supabase, user } = await requireOrganizer(locale);
  const eventId = formData.get('eventId') as string;
  const status = formData.get('status') as EventStatus;

  if (!eventId || !status || !['draft', 'published', 'closed'].includes(status)) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent('活动状态无效')}`);
  }

  const { error } = await supabase
    .from('events')
    .update({ status } as never)
    .eq('id', eventId)
    .eq('organizer_id', user.id);

  if (error) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/my-events?success=true`);
}
