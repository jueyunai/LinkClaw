'use server';

import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { BountyRank, Database, EventStatus, UserRole } from '@/types/database';

type EventFormValues = {
  title: string;
  description: string;
  targetAudience: string | null;
  eventDate: string;
  location: string;
  maxGuests: number;
  bountyRank: BountyRank;
};

type EventReturnTo = 'manage' | 'my-events';
type ErrorTranslator = Awaited<ReturnType<typeof getTranslations<'errors'>>>;

function getEventRedirectPath(locale: string, eventId: string, returnTo: EventReturnTo = 'my-events') {
  return returnTo === 'manage' ? `/${locale}/events/${eventId}/manage` : `/${locale}/my-events`;
}

function getStatusSuccess(status: EventStatus, returnTo: EventReturnTo) {
  if (status === 'closed') {
    return 'closed';
  }

  if (status === 'published') {
    return returnTo === 'manage' ? 'published' : 'republished';
  }

  return 'draft_saved';
}

function parseEventFormData(formData: FormData): EventFormValues {
  const bountyRankValue = formData.get('bountyRank');

  return {
    title: (formData.get('title') as string)?.trim(),
    description: (formData.get('description') as string)?.trim(),
    targetAudience: ((formData.get('targetAudience') as string) || '').trim() || null,
    eventDate: formData.get('eventDate') as string,
    location: (formData.get('location') as string)?.trim(),
    maxGuests: Number(formData.get('maxGuests')),
    bountyRank: Number(bountyRankValue === null || bountyRankValue === '' ? 1 : bountyRankValue) as BountyRank,
  };
}

function validateEventFormValues(
  tErrors: ErrorTranslator,
  locale: string,
  values: EventFormValues,
  errorPath: string,
) {
  if (
    !values.title ||
    !values.description ||
    !values.eventDate ||
    !values.location ||
    !Number.isFinite(values.maxGuests) ||
    !Number.isFinite(values.bountyRank)
  ) {
    redirect(`/${locale}/${errorPath}?error=${encodeURIComponent(tErrors('missingEventInfo'))}`);
  }

  if (values.maxGuests <= 0) {
    redirect(`/${locale}/${errorPath}?error=${encodeURIComponent(tErrors('maxGuestsInvalid'))}`);
  }

  if (values.bountyRank < 1 || values.bountyRank > 5) {
    redirect(`/${locale}/${errorPath}?error=${encodeURIComponent(tErrors('invalidBountyRank'))}`);
  }
}

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
  const tErrors = await getTranslations('errors');
  const { supabase, user } = await requireOrganizer(locale);
  const values = parseEventFormData(formData);
  const intent = formData.get('intent') as string | null;
  const status: EventStatus = intent === 'publish' ? 'published' : 'draft';

  validateEventFormValues(tErrors, locale, values, 'events/new');

  const eventInsert: Database['public']['Tables']['events']['Insert'] = {
    organizer_id: user.id,
    title: values.title,
    description: values.description,
    target_audience: values.targetAudience,
    event_date: new Date(values.eventDate).toISOString(),
    location: values.location,
    max_guests: values.maxGuests,
    bounty_rank: values.bountyRank,
    status,
  };

  const { data, error } = await supabase
    .from('events')
    .insert(eventInsert as never)
    .select('id')
    .single();
  const createdEvent = data as { id: string } | null;

  if (error || !createdEvent) {
    redirect(
      `/${locale}/events/new?error=${encodeURIComponent(error?.message ?? tErrors('eventCreateFailed'))}`,
    );
  }

  const success = status === 'published' ? 'published' : 'draft_saved';
  redirect(`/${locale}/events/${createdEvent.id}/manage?success=${success}`);
}

export async function updateEvent(formData: FormData) {
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const { supabase, user } = await requireOrganizer(locale);
  const eventId = formData.get('eventId') as string;
  const values = parseEventFormData(formData);

  if (!eventId) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('eventNotFound'))}`);
  }

  validateEventFormValues(tErrors, locale, values, `events/${eventId}/manage`);

  const eventUpdate: Database['public']['Tables']['events']['Update'] = {
    title: values.title,
    description: values.description,
    target_audience: values.targetAudience,
    event_date: new Date(values.eventDate).toISOString(),
    location: values.location,
    max_guests: values.maxGuests,
    bounty_rank: values.bountyRank,
  };

  const { error } = await supabase
    .from('events')
    .update(eventUpdate as never)
    .eq('id', eventId)
    .eq('organizer_id', user.id);

  if (error) {
    redirect(`/${locale}/events/${eventId}/manage?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/events/${eventId}/manage?success=updated`);
}

export async function updateEventStatus(formData: FormData) {
  const locale = await getLocale();
  const tErrors = await getTranslations('errors');
  const { supabase, user } = await requireOrganizer(locale);
  const eventId = formData.get('eventId') as string;
  const status = formData.get('status') as EventStatus;
  const returnTo = (formData.get('returnTo') as EventReturnTo | null) ?? 'my-events';

  if (!eventId || !status || !['draft', 'published', 'closed'].includes(status)) {
    redirect(`/${locale}/my-events?error=${encodeURIComponent(tErrors('invalidEventStatus'))}`);
  }

  const redirectPath = getEventRedirectPath(locale, eventId, returnTo);

  const { error } = await supabase
    .from('events')
    .update({ status } as never)
    .eq('id', eventId)
    .eq('organizer_id', user.id);

  if (error) {
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  const success = getStatusSuccess(status, returnTo);
  redirect(`${redirectPath}?success=${success}`);
}
