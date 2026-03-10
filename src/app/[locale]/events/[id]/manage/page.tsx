import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { inviteGuest } from '@/app/[locale]/registrations/actions';
import {
  getMockRecommendedGuestsForEvent,
  type MockGuestRecommendation,
} from '@/lib/ai/mock-recommendation';
import { createClient } from '@/lib/supabase/server';
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

interface ManageEventPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

type OrganizerProfile = {
  role: UserRole;
};

type ManageEvent = {
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

type ManageRegistration = {
  id: string;
  guest_id: string;
  type: 'applied' | 'invited';
  status: RegistrationStatus;
  ai_match_reason: string | null;
  created_at: string;
};

type ManageGuest = {
  id: string;
  display_name: string;
  bio: string | null;
  industry: string | null;
  city: string | null;
  role: UserRole;
};

export default async function ManageEventPage({ params, searchParams }: ManageEventPageProps) {
  const { locale, id } = await params;
  const { error, success } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/events/${id}/manage`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const organizerProfile = profile as OrganizerProfile | null;

  if (!organizerProfile || organizerProfile.role !== 'organizer') {
    redirect(`/${locale}`);
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, title, description, target_audience, event_date, location, max_guests, status')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .single();
  const manageEvent = event as ManageEvent | null;

  if (!manageEvent) {
    notFound();
  }

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, guest_id, type, status, ai_match_reason, created_at')
    .eq('event_id', manageEvent.id)
    .order('created_at', { ascending: false });

  const allRegistrations = (registrations ?? []) as ManageRegistration[];
  const invitedRegistrations = allRegistrations.filter(
    (item): item is ManageRegistration & { type: 'invited' } => item.type === 'invited',
  );
  const registeredGuestIds = [...new Set(allRegistrations.map((item) => item.guest_id))];

  const { data: guests } = await supabase
    .from('profiles')
    .select('id, display_name, bio, industry, city, role')
    .eq('role', 'guest');
  const allGuests = (guests ?? []) as ManageGuest[];

  const guestMap = new Map(allGuests.map((guest) => [guest.id, guest]));

  const recommendedGuests = getMockRecommendedGuestsForEvent(
    manageEvent,
    allGuests.filter((guest) => !registeredGuestIds.includes(guest.id)),
  )
    .map((recommendation) => ({
      recommendation,
      guest: guestMap.get(recommendation.guestId) ?? null,
    }))
    .filter(
      (
        item,
      ): item is {
        recommendation: MockGuestRecommendation;
        guest: {
          id: string;
          display_name: string;
          bio: string | null;
          industry: string | null;
          city: string | null;
          role: UserRole;
        };
      } => Boolean(item.guest),
    );

  const invitedGuests = invitedRegistrations.map((registration) => ({
    ...registration,
    guest: guestMap.get(registration.guest_id) ?? null,
  }));

  return (
    <ManageEventContent
      event={manageEvent}
      recommendedGuests={recommendedGuests}
      invitedGuests={invitedGuests}
      error={error}
      success={success}
    />
  );
}

function ManageEventContent({
  event,
  recommendedGuests,
  invitedGuests,
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
  recommendedGuests: Array<{
    recommendation: MockGuestRecommendation;
    guest: {
      id: string;
      display_name: string;
      bio: string | null;
      industry: string | null;
      city: string | null;
      role: UserRole;
    };
  }>;
  invitedGuests: Array<{
    id: string;
    guest_id: string;
    type: 'invited';
    status: RegistrationStatus;
    ai_match_reason: string | null;
    created_at: string;
    guest: {
      id: string;
      display_name: string;
      bio: string | null;
      industry: string | null;
      city: string | null;
      role: UserRole;
    } | null;
  }>;
  error?: string;
  success?: string;
}) {
  const tCommon = useTranslations('common');
  const tEvents = useTranslations('events');
  const tMyEvents = useTranslations('myEvents');
  const tRecommendation = useTranslations('recommendation');
  const locale = useLocale();
  const keywordSeparator = tRecommendation('reasonKeywordsSeparator');
  const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.event_date));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">{tMyEvents('manageEvent')}</p>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{event.title}</h1>
                <p className="text-sm text-muted-foreground">{tMyEvents('manageEventIntro')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/events/${event.id}`}>
                  <Button variant="outline">{tMyEvents('viewEvent')}</Button>
                </Link>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          ) : null}

          {success === 'invited' ? (
            <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
              {tMyEvents('invitationSent')}
            </div>
          ) : null}

          <Card className="border-border/60 bg-card/85 shadow-sm">
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={eventStatusVariantMap[event.status]}>{tEvents(event.status)}</Badge>
                  <CardTitle className="text-xl">{tMyEvents('manageEvent')}</CardTitle>
                </div>
                <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>{tEvents('eventDate')} · {date}</span>
                  <span>{tEvents('location')} · {event.location}</span>
                  <span>{tEvents('maxGuests')} · {event.max_guests}</span>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">{event.description}</p>
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {tEvents('targetAudience')}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {event.target_audience || tEvents('targetAudiencePlaceholder')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="recommended" className="gap-5">
            <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
              <TabsTrigger value="recommended">
                {tRecommendation('recommendedGuests')} · {recommendedGuests.length}
              </TabsTrigger>
              <TabsTrigger value="invited">
                {tMyEvents('invitationPipeline')} · {invitedGuests.length}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommended" className="space-y-4">
              {recommendedGuests.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {recommendedGuests.map(({ recommendation, guest }) => {
                    const localizedReasonParams: Record<string, string | number | Date> | undefined =
                      recommendation.matchReasonParams?.keywords
                        ? {
                            keywords: recommendation.matchReasonParams.keywords.join(keywordSeparator),
                          }
                        : recommendation.matchReasonParams?.value
                          ? {
                              value: recommendation.matchReasonParams.value,
                            }
                          : undefined;
                    const localizedReason = tRecommendation(
                      recommendation.matchReasonKey,
                      localizedReasonParams,
                    );

                    return (
                      <Card key={guest.id} className="border-border/60 bg-card/85 shadow-sm">
                        <CardHeader className="gap-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-xl">{guest.display_name || tCommon('guest')}</CardTitle>
                              <CardDescription className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                                <span>{tProfileField(guest.industry)}</span>
                                <span>{tProfileField(guest.city)}</span>
                              </CardDescription>
                            </div>
                            <Badge>{recommendation.matchScore}% {tRecommendation('matchScore')}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
                              {tRecommendation('reason')}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{localizedReason}</p>
                          </div>
                          <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                            {guest.bio || '—'}
                          </p>
                          <form action={inviteGuest} className="flex flex-wrap items-center gap-3">
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="guestId" value={guest.id} />
                            <input type="hidden" name="aiMatchReason" value={localizedReason} />
                            <Button type="submit" disabled={event.status !== 'published'}>
                              {tMyEvents('inviteGuest')}
                            </Button>
                            {event.status !== 'published' ? (
                              <p className="text-xs text-muted-foreground">{tEvents('published')}</p>
                            ) : null}
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text={tMyEvents('emptyRecommendedGuests')} />
              )}
            </TabsContent>

            <TabsContent value="invited" className="space-y-4">
              {invitedGuests.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {invitedGuests.map((item) => {
                    const invitedAt = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(item.created_at));

                    return (
                      <Card key={item.id} className="border-border/60 bg-card/85 shadow-sm">
                        <CardHeader className="gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-xl">
                                {item.guest?.display_name || tCommon('guest')}
                              </CardTitle>
                              <CardDescription className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                                <span>{tProfileField(item.guest?.industry ?? null)}</span>
                                <span>{tProfileField(item.guest?.city ?? null)}</span>
                                <span>{invitedAt}</span>
                              </CardDescription>
                            </div>
                            <Badge variant={registrationStatusVariantMap[item.status]}>
                              {tMyEvents(item.status)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
                            {item.ai_match_reason || tRecommendation('guestReasonFallback')}
                          </div>
                          <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                            {item.guest?.bio || '—'}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text={tMyEvents('emptyInvitationPipeline')} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function tProfileField(value: string | null) {
  return value || '—';
}
