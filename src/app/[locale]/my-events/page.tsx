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
import { CloseQuestButton } from '@/components/features/close-quest-button';
import { SearchParamsToast } from '@/components/features/search-params-toast';
import { RankBadge } from '@/components/features/rank-badge';
import { BackButton } from '@/components/ui/back-button';
import type { EventStatus, HunterLevel, RegistrationStatus, UserRole } from '@/types/database';

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
  searchParams: Promise<{ error?: string; success?: string; profileUpdated?: string }>;
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
    .select('role, display_name, bio, industry, city, hunter_level')
    .eq('id', user.id)
    .single();
  const currentProfile = profile as { role: UserRole; display_name: string; bio: string | null; industry: string | null; city: string | null; hunter_level: HunterLevel } | null;

  if (!currentProfile) {
    redirect(`/${locale}`);
  }

  const { error, success: rawSuccess, profileUpdated } = await searchParams;
  // Map profileUpdated=true to success=profileUpdated for SearchParamsToast
  const success = profileUpdated === 'true' ? 'profileUpdated' : rawSuccess;

  if (currentProfile.role === 'organizer') {
    const { data: events } = await supabase
      .from('events')
      .select('id, title, location, event_date, max_guests, status, created_at')
      .eq('organizer_id', user.id)
      .order('event_date', { ascending: true });

    return (
      <OrganizerEventsContent
        organizerName={currentProfile.display_name}
        organizerBio={currentProfile.bio}
        organizerIndustry={currentProfile.industry}
        organizerCity={currentProfile.city}
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
    .select('id, event_id, type, status, created_at, ai_match_reason')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false });

  const guestRegistrations = (registrations ?? []) as Array<{
    id: string;
    event_id: string;
    type: 'applied' | 'invited';
    status: RegistrationStatus;
    created_at: string;
    ai_match_reason: string | null;
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
      guestBio={currentProfile.bio}
      guestIndustry={currentProfile.industry}
      guestCity={currentProfile.city}
      hunterLevel={currentProfile.hunter_level}
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
  organizerBio,
  organizerIndustry,
  organizerCity,
  events,
  error,
  success,
}: {
  organizerName: string;
  organizerBio: string | null;
  organizerIndustry: string | null;
  organizerCity: string | null;
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
  const tProfile = useTranslations('profile');
  const locale = useLocale();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <SearchParamsToast
          error={error}
          success={success}
          successMessages={{
            published: tEvents('eventPublished'),
            republished: tEvents('eventPublished'),
            closed: tEvents('eventClosed'),
            draft_saved: tEvents('draftSaved'),
          }}
        />
        <BackButton />
        {/* Header with profile summary */}
        <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{tMyEvents('organizerConsole')}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {tMyEvents('myBounties')}
            </h1>
            {/* Profile summary inline */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{organizerName}</span>
              <span>·</span>
              <span>{events.length} {tEvents('published')}</span>
              {organizerIndustry ? (
                <>
                  <span>·</span>
                  <span>{tMyEvents('industryLabel')}: {organizerIndustry}</span>
                </>
              ) : null}
              {organizerCity ? (
                <>
                  <span>·</span>
                  <span>{tMyEvents('cityLabel')}: {organizerCity}</span>
                </>
              ) : null}
            </div>
            {organizerBio ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80 line-clamp-2">
                {organizerBio}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/profile?from=center">
              <Button variant="outline" size="sm">{tMyEvents('editProfile')}</Button>
            </Link>
            <Link href="/events/new">
              <Button>{tEvents('create')}</Button>
            </Link>
          </div>
        </div>

        {events.length > 0 ? (
          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/85 shadow-sm">
            {events.map((event) => {
              const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(event.event_date));

              return (
                <div key={event.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={eventStatusVariantMap[event.status]}>
                        {tEvents(event.status)}
                      </Badge>
                      <span className="text-base font-semibold truncate">{event.title}</span>
                    </div>
                    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{tEvents('eventDate')} · {date}</span>
                      <span>{tEvents('location')} · {event.location}</span>
                      <span>{tEvents('maxGuests')} · {event.max_guests}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {event.status !== 'published' ? (
                      <form action={updateEventStatus}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="published" />
                        <input type="hidden" name="returnTo" value="my-events" />
                        <Button type="submit" size="sm" variant="outline">
                          {event.status === 'closed' ? tEvents('republish') : tEvents('publish')}
                        </Button>
                      </form>
                    ) : null}

                    {event.status === 'published' ? (
                      <CloseQuestButton eventId={event.id} />
                    ) : null}

                    <Link href={`/events/${event.id}/manage`}>
                      <Button variant="outline" size="sm">{tEvents('manage')}</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{tMyEvents('myBounties')}</h2>
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
  guestBio,
  guestIndustry,
  guestCity,
  hunterLevel,
  registrations,
  error,
  success,
}: {
  guestName: string;
  guestBio: string | null;
  guestIndustry: string | null;
  guestCity: string | null;
  hunterLevel: HunterLevel;
  registrations: Array<{
    id: string;
    event_id: string;
    type: 'applied' | 'invited';
    status: RegistrationStatus;
    created_at: string;
    ai_match_reason: string | null;
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
  const tMyEvents = useTranslations('myEvents');
  const tProfile = useTranslations('profile');

  const applied = registrations.filter((item) => item.type === 'applied');
  const invited = registrations.filter((item) => item.type === 'invited');

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <BackButton />
        {/* Header with profile summary — mirrors organizer layout */}
        <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{tMyEvents('guestCenter')}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {tMyEvents('myClaims')}
            </h1>
            {/* Profile summary inline */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{guestName}</span>
              <RankBadge level={hunterLevel} />
              {guestIndustry ? (
                <>
                  <span>·</span>
                  <span>{tMyEvents('industryLabel')}: {guestIndustry}</span>
                </>
              ) : null}
              {guestCity ? (
                <>
                  <span>·</span>
                  <span>{tMyEvents('cityLabel')}: {guestCity}</span>
                </>
              ) : null}
            </div>
            {guestBio ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80 line-clamp-2">
                {guestBio}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/profile?from=center">
              <Button variant="outline" size="sm">{tMyEvents('editProfile')}</Button>
            </Link>
          </div>
        </div>

        <SearchParamsToast
          error={error}
          success={success}
          successMessages={{
            invitation_accepted: tMyEvents('invitationAccepted'),
            invitation_rejected: tMyEvents('invitationRejected'),
            profileUpdated: tProfile('saveSuccess'),
          }}
        />

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
              <div className="rounded-[1.25rem] border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">{tMyEvents('emptyRegistered')}</p>
                <div className="mt-4">
                  <Link href="/">
                    <Button variant="outline" size="sm">{tMyEvents('goToBountyHall')}</Button>
                  </Link>
                </div>
              </div>
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

export function GuestInvitationCard({
  item,
}: {
  item: {
    id: string;
    status: RegistrationStatus;
    ai_match_reason?: string | null;
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

  /* Event has been deleted or is no longer accessible */
  if (!item.event) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm opacity-60">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={registrationStatusVariantMap[item.status]}>{tMyEvents(item.status)}</Badge>
            <CardTitle className="text-xl">{tMyEvents('invited')}</CardTitle>
          </div>
          <CardDescription>{tMyEvents('eventUnavailable')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(item.event.event_date));

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={registrationStatusVariantMap[item.status]}>{tMyEvents(item.status)}</Badge>
          <CardTitle className="text-xl">{item.event.title}</CardTitle>
        </div>
        <CardDescription>
          {tEvents('eventDate')} · {date} · {tEvents('location')} · {item.event.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.ai_match_reason ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium">{tMyEvents('invitationReason')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.ai_match_reason}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {item.status === 'pending' && item.event.status === 'published' ? (
            <>
              <form action={respondToInvitation}>
                <input type="hidden" name="registrationId" value={item.id} />
                <input type="hidden" name="status" value="accepted" />
                <Button type="submit" size="sm">{tMyEvents('acceptInvitation')}</Button>
              </form>
              <form action={respondToInvitation}>
                <input type="hidden" name="registrationId" value={item.id} />
                <input type="hidden" name="status" value="rejected" />
                <Button type="submit" size="sm" variant="outline">{tMyEvents('rejectInvitation')}</Button>
              </form>
            </>
          ) : null}
          {item.status === 'pending' && item.event.status === 'closed' ? (
            <span className="text-xs text-muted-foreground">{tMyEvents('questClosedHint')}</span>
          ) : null}
          <Link href={`/events/${item.event.id}`}>
            <Button variant="outline" size="sm">{tMyEvents('viewEvent')}</Button>
          </Link>
        </div>
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
