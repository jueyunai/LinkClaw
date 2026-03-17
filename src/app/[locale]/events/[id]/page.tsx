import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { applyToEvent } from '@/app/[locale]/registrations/actions';
import type {
  EventStatus,
  RegistrationStatus,
  RegistrationType,
  UserRole,
} from '@/types/database';

const statusVariantMap: Record<EventStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
};

type EventDetailEvent = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  target_audience: string | null;
  event_date: string;
  location: string;
  max_guests: number;
  status: EventStatus;
};

type OrganizerProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  role: UserRole;
};

type EventRegistration = {
  type: RegistrationType;
  status: RegistrationStatus;
};

function getRegistrationLabel(
  registration: EventRegistration | null,
  tEvents: ReturnType<typeof useTranslations>,
) {
  if (!registration) {
    return null;
  }

  const registrationLabelKeyMap: Record<RegistrationType, Record<RegistrationStatus, string>> = {
    applied: {
      pending: 'applicationPending',
      accepted: 'applicationAccepted',
      rejected: 'applicationRejected',
    },
    invited: {
      pending: 'invitationPending',
      accepted: 'invitationAccepted',
      rejected: 'invitationRejected',
    },
  };

  return tEvents(registrationLabelKeyMap[registration.type][registration.status]);
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, title, description, target_audience, event_date, location, max_guests, status')
    .eq('id', id)
    .single();
  const eventDetail = event as EventDetailEvent | null;

  if (!eventDetail) {
    notFound();
  }

  const { data: organizer } = await supabase
    .from('profiles')
    .select('id, display_name, bio, industry, city, role')
    .eq('id', eventDetail.organizer_id)
    .single();
  const organizerProfile = organizer as OrganizerProfile | null;

  let profile: { role: UserRole } | null = null;
  let registration: EventRegistration | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    profile = profileData as { role: UserRole } | null;

    const { data: registrationData } = await supabase
      .from('registrations')
      .select('type, status')
      .eq('event_id', eventDetail.id)
      .eq('guest_id', user.id)
      .maybeSingle();

    registration = registrationData as EventRegistration | null;
  }

  if (eventDetail.status === 'draft' && user?.id !== eventDetail.organizer_id) {
    redirect(`/${locale}`);
  }

  const { error, success } = await searchParams;

  return (
    <EventDetailContent
      event={eventDetail}
      organizer={organizerProfile}
      currentUserId={user?.id ?? null}
      currentUserRole={profile?.role ?? null}
      registration={registration}
      error={error}
      success={success}
    />
  );
}

export function EventDetailContent({
  event,
  organizer,
  currentUserId,
  currentUserRole,
  registration,
  error,
  success,
}: {
  event: {
    id: string;
    organizer_id: string;
    title: string;
    description: string;
    target_audience: string | null;
    event_date: string;
    location: string;
    max_guests: number;
    status: EventStatus;
  };
  organizer: {
    id: string;
    display_name: string;
    bio: string | null;
    industry: string | null;
    city: string | null;
    role: UserRole;
  } | null;
  currentUserId: string | null;
  currentUserRole: UserRole | null;
  registration: EventRegistration | null;
  error?: string;
  success?: string;
}) {
  const tEvents = useTranslations('events');
  const tProfile = useTranslations('profile');
  const locale = useLocale();
  const isOwner = currentUserId === event.organizer_id;
  const canApply = currentUserRole === 'guest' && !registration && event.status === 'published';
  const showLoginToApply = !currentUserId && event.status === 'published';
  const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.event_date));

  const organizerName = organizer?.display_name || tProfile('organizerNameFallback');
  const organizerInitial = organizerName.slice(0, 1).toUpperCase();
  const registrationLabel = getRegistrationLabel(registration, tEvents);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={statusVariantMap[event.status]}>{tEvents(event.status)}</Badge>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
                    {tEvents('eventBadge')}
                  </div>
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-3xl leading-tight md:text-4xl">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-base leading-7 text-muted-foreground">
                    {event.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {error ? (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                {success === 'applied' ? (
                  <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                    {tEvents('applied')}
                  </div>
                ) : null}
                <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {tEvents('eventDate')}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6">{date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {tEvents('location')}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6">{event.location}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {tEvents('maxGuests')}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6">{event.max_guests}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {tEvents('targetAudience')}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {event.target_audience || tEvents('targetAudiencePlaceholder')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/85 shadow-lg">
              <CardHeader>
                <CardTitle>{organizerName}</CardTitle>
                <CardDescription>
                  {organizer?.role === 'organizer' ? tProfile('organizerProfile') : tProfile('title')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>{organizerInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{organizerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {organizer?.industry || tProfile('organizerRoleFallback')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
                  <p>{organizer?.bio || tProfile('organizerBioFallback')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em]">{tProfile('industry')}</p>
                      <p className="mt-1 text-foreground/90">{organizer?.industry || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em]">{tProfile('city')}</p>
                      <p className="mt-1 text-foreground/90">{organizer?.city || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isOwner ? (
                    <Link href={`/events/${event.id}/manage`}>
                      <Button>{tEvents('manage')}</Button>
                    </Link>
                  ) : canApply ? (
                    <form action={applyToEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <Button type="submit">{tEvents('apply')}</Button>
                    </form>
                  ) : registrationLabel ? (
                    <Button disabled>{registrationLabel}</Button>
                  ) : showLoginToApply ? (
                    <Link href={`/auth/login?redirect=/events/${event.id}`}>
                      <Button>{tEvents('apply')}</Button>
                    </Link>
                  ) : (
                    <Button disabled>{tEvents('apply')}</Button>
                  )}
                  <Link href="/">
                    <Button variant="outline">{tEvents('backToList')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
