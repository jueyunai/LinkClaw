import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
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
import { updateEventStatus } from '@/app/[locale]/events/actions';
import { respondToInvitation } from '@/app/[locale]/registrations/actions';
import type { EventStatus, RegistrationStatus, UserRole } from '@/types/database';

const eventStatusVariantMap: Record<EventStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
};

const registrationStatusVariantMap: Record<RegistrationStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  accepted: 'default',
  rejected: 'destructive',
};

export default async function MyEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/my-events`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();
  const currentProfile = profile as { role: UserRole; display_name: string } | null;

  if (!currentProfile) {
    redirect(`/${locale}`);
  }

  const { error, success } = await searchParams;

  if (currentProfile.role === 'organizer') {
    const { data: events } = await supabase
      .from('events')
      .select('id, title, location, event_date, max_guests, status, created_at')
      .eq('organizer_id', user.id)
      .order('event_date', { ascending: true });

    return (
      <OrganizerEventsContent
        organizerName={currentProfile.display_name}
        events={(events ?? []) as Array<{
          id: string;
          title: string;
          location: string;
          event_date: string;
          max_guests: number;
          status: EventStatus;
          created_at: string;
        }>}
        error={error}
        success={success}
      />
    );
  }

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, event_id, type, status, created_at')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false });

  const guestRegistrations = (registrations ?? []) as Array<{
    id: string;
    event_id: string;
    type: 'applied' | 'invited';
    status: RegistrationStatus;
    created_at: string;
  }>;
  const eventIds = [...new Set(guestRegistrations.map((item) => item.event_id))];

  const { data: events } = eventIds.length
    ? await supabase
        .from('events')
        .select('id, title, location, event_date, status')
        .in('id', eventIds)
    : { data: [] };

  const eventsById = new Map(
    ((events ?? []) as Array<{
      id: string;
      title: string;
      location: string;
      event_date: string;
      status: EventStatus;
    }>).map((event) => [event.id, event]),
  );

  return (
    <GuestEventsContent
      guestName={currentProfile.display_name}
      registrations={guestRegistrations.map((registration) => ({
        ...registration,
        event: eventsById.get(registration.event_id) ?? null,
      }))}
      error={error}
      success={success}
    />
  );
}

function OrganizerEventsContent({
  organizerName,
  events,
  error,
  success,
}: {
  organizerName: string;
  events: Array<{
    id: string;
    title: string;
    location: string;
    event_date: string;
    max_guests: number;
    status: EventStatus;
    created_at: string;
  }>;
  error?: string;
  success?: string;
}) {
  const tEvents = useTranslations('events');
  const tMyEvents = useTranslations('myEvents');
  const locale = useLocale();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{tMyEvents('organizerConsole')}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {tMyEvents('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {organizerName} · {events.length} {tEvents('published')}
            </p>
          </div>
          <Link href="/events/new">
            <Button>{tEvents('create')}</Button>
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success === 'true' ? (
          <div className="mb-4 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            {tMyEvents('statusUpdated')}
          </div>
        ) : null}

        {events.length > 0 ? (
          <div className="grid gap-5">
            {events.map((event) => {
              const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(event.event_date));

              return (
                <Card key={event.id} className="border-border/60 bg-card/85 shadow-sm">
                  <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={eventStatusVariantMap[event.status]}>
                          {tEvents(event.status)}
                        </Badge>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                      </div>
                      <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>{tEvents('eventDate')} · {date}</span>
                        <span>{tEvents('location')} · {event.location}</span>
                        <span>{tEvents('maxGuests')} · {event.max_guests}</span>
                      </CardDescription>
                    </div>
                    <Link href={`/events/${event.id}/manage`}>
                      <Button variant="outline" size="sm">{tEvents('manage')}</Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 border-t bg-muted/20 py-4">
                    {(['draft', 'published', 'closed'] as const).map((status) => (
                      <form action={updateEventStatus} key={status}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value={status} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={event.status === status ? 'default' : 'outline'}
                        >
                          {tEvents(status)}
                        </Button>
                      </form>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{tMyEvents('title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {tMyEvents('emptyOrganizer')}
            </p>
            <div className="mt-6">
              <Link href="/events/new">
                <Button>{tEvents('create')}</Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function GuestEventsContent({
  guestName,
  registrations,
  error,
  success,
}: {
  guestName: string;
  registrations: Array<{
    id: string;
    event_id: string;
    type: 'applied' | 'invited';
    status: RegistrationStatus;
    created_at: string;
    event: {
      id: string;
      title: string;
      location: string;
      event_date: string;
      status: EventStatus;
    } | null;
  }>;
  error?: string;
  success?: string;
}) {
  const tEvents = useTranslations('events');
  const tMyEvents = useTranslations('myEvents');

  const applied = registrations.filter((item) => item.type === 'applied');
  const invited = registrations.filter((item) => item.type === 'invited');

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{tMyEvents('guestCenter')}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {tMyEvents('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{guestName}</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success === 'invitation_accepted' ? (
          <div className="mb-4 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            {tMyEvents('invitationAccepted')}
          </div>
        ) : null}

        {success === 'invitation_rejected' ? (
          <div className="mb-4 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            {tMyEvents('invitationRejected')}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{tMyEvents('registered')}</h2>
              <p className="text-sm text-muted-foreground">{tMyEvents('registeredIntro')}</p>
            </div>
            {applied.length > 0 ? (
              applied.map((item) => (
                <GuestRegistrationCard key={item.id} item={item} title={tMyEvents('registered')} />
              ))
            ) : (
              <EmptyState text={tMyEvents('emptyRegistered')} />
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{tMyEvents('invited')}</h2>
              <p className="text-sm text-muted-foreground">{tMyEvents('invitedIntro')}</p>
            </div>
            {invited.length > 0 ? (
              invited.map((item) => (
                <GuestInvitationCard key={item.id} item={item} />
              ))
            ) : (
              <EmptyState text={tMyEvents('emptyInvited')} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function GuestRegistrationCard({
  item,
  title,
}: {
  item: {
    id: string;
    status: RegistrationStatus;
    event: {
      id: string;
      title: string;
      location: string;
      event_date: string;
      status: EventStatus;
    } | null;
  };
  title: string;
}) {
  const tEvents = useTranslations('events');
  const tMyEvents = useTranslations('myEvents');
  const locale = useLocale();
  const date = item.event
    ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(item.event.event_date))
    : '-';

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={registrationStatusVariantMap[item.status]}>{tMyEvents(item.status)}</Badge>
          <CardTitle className="text-xl">{item.event?.title || title}</CardTitle>
        </div>
        <CardDescription>
          {tEvents('eventDate')} · {date} · {tEvents('location')} · {item.event?.location || '-'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {item.event ? (
          <Link href={`/events/${item.event.id}`}>
            <Button variant="outline" size="sm">{tMyEvents('viewEvent')}</Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GuestInvitationCard({
  item,
}: {
  item: {
    id: string;
    status: RegistrationStatus;
    event: {
      id: string;
      title: string;
      location: string;
      event_date: string;
      status: EventStatus;
    } | null;
  };
}) {
  const tEvents = useTranslations('events');
  const tMyEvents = useTranslations('myEvents');
  const locale = useLocale();
  const date = item.event
    ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(item.event.event_date))
    : '-';

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={registrationStatusVariantMap[item.status]}>{tMyEvents(item.status)}</Badge>
          <CardTitle className="text-xl">{item.event?.title || tMyEvents('invited')}</CardTitle>
        </div>
        <CardDescription>
          {tEvents('eventDate')} · {date} · {tEvents('location')} · {item.event?.location || '-'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {item.status === 'pending' ? (
          <>
            <form action={respondToInvitation}>
              <input type="hidden" name="registrationId" value={item.id} />
              <input type="hidden" name="status" value="accepted" />
              <Button type="submit" size="sm">{tMyEvents('accepted')}</Button>
            </form>
            <form action={respondToInvitation}>
              <input type="hidden" name="registrationId" value={item.id} />
              <input type="hidden" name="status" value="rejected" />
              <Button type="submit" size="sm" variant="outline">{tMyEvents('rejected')}</Button>
            </form>
          </>
        ) : null}
        {item.event ? (
          <Link href={`/events/${item.event.id}`}>
            <Button variant="outline" size="sm">{tMyEvents('viewEvent')}</Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-border bg-muted/30 px-5 py-10 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
