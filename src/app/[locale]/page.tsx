import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EventCard } from '@/components/features/event-card';
import { SpriteBubble } from '@/components/features/sprite-bubble';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getEventRecommendations } from '@/lib/ai/recommendation';
import type { EventRecommendation } from '@/lib/ai/pipeline/types';
import type { BountyRank, EventStatus, HunterLevel, Profile, UserRole } from '@/types/database';

interface HomeEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  max_guests: number;
  status: EventStatus;
  target_audience: string | null;
  organizer_id: string;
  bounty_rank: BountyRank;
}

function shouldPromptProfileCompletion(
  profile: Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role'> | null,
) {
  if (!profile) {
    return true;
  }

  return !profile.bio?.trim() || !profile.industry?.trim() || !profile.city?.trim();
}

function getPatrolMessageKey(hour: number) {
  if (hour < 10) {
    return 'patrolMorning';
  }

  if (hour < 18) {
    return 'patrolAfternoon';
  }

  return 'patrolNight';
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role' | 'hunter_level'> | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('bio, industry, city, display_name, role, hunter_level')
      .eq('id', user.id)
      .single();

    profile = data as Pick<
      Profile,
      'bio' | 'industry' | 'city' | 'display_name' | 'role' | 'hunter_level'
    > | null;
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, location, event_date, max_guests, status, target_audience, organizer_id, bounty_rank')
    .eq('status', 'published')
    .order('event_date', { ascending: true });

  const publishedEvents = (events ?? []) as HomeEvent[];
  const hunterLevel = profile?.role === 'guest' ? profile.hunter_level : undefined;
  const recommendations: EventRecommendation[] =
    profile && profile.role === 'guest'
      ? await getEventRecommendations(
          {
            id: user?.id ?? '',
            display_name: profile.display_name,
            bio: profile.bio,
            industry: profile.industry,
            city: profile.city,
          },
          publishedEvents,
          undefined,
          hunterLevel,
        )
      : [];
  const shouldShowProfilePrompt = user !== null && shouldPromptProfileCompletion(profile);

  return (
    <HomeContent
      events={publishedEvents}
      userRole={profile?.role ?? null}
      userId={user?.id ?? null}
      recommendations={recommendations}
      shouldShowProfilePrompt={shouldShowProfilePrompt}
      hunterLevel={hunterLevel}
    />
  );
}

function HomeContent({
  events,
  userRole,
  userId,
  recommendations,
  shouldShowProfilePrompt,
  hunterLevel,
}: {
  events: HomeEvent[];
  userRole: UserRole | null;
  userId: string | null;
  recommendations: EventRecommendation[];
  shouldShowProfilePrompt: boolean;
  hunterLevel?: HunterLevel;
}) {
  const tHome = useTranslations('home');
  const tEvents = useTranslations('events');
  const tRecommendation = useTranslations('recommendation');
  const tBounty = useTranslations('bounty');
  const tSprite = useTranslations('sprite');
  const keywordSeparator = tRecommendation('reasonKeywordsSeparator');
  const recommendedEventIds = new Set(recommendations.map((item) => item.eventId));
  const recommendedEvents = recommendations
    .map((recommendation) => ({
      recommendation,
      event: events.find((event) => event.id === recommendation.eventId) ?? null,
    }))
    .filter((item): item is { recommendation: (typeof recommendations)[number]; event: HomeEvent } =>
      Boolean(item.event),
    );
  const regularEvents = events.filter((event) => !recommendedEventIds.has(event.id));
  const lockedEventCount =
    hunterLevel === undefined
      ? 0
      : events.filter((event) => event.bounty_rank > hunterLevel).length;
  const nextUnlockCount =
    hunterLevel === undefined || hunterLevel >= 5
      ? 0
      : events.filter((event) => event.bounty_rank === hunterLevel + 1).length;
  const patrolMessage = tSprite(getPatrolMessageKey(new Date().getHours()), {
    count: recommendations.length,
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,rgba(255,247,221,0.4),transparent_30%)]">
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-amber-900/10 bg-[linear-gradient(135deg,rgba(120,72,24,0.92),rgba(92,53,22,0.88))] px-6 py-10 text-amber-50 shadow-[0_30px_80px_rgba(87,48,15,0.28)] md:px-10 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,204,102,0.3),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.22),transparent_28%)]" />
          <div className="relative max-w-3xl space-y-5">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-amber-200/90">
              {tBounty('hallBanner')}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-amber-50 md:text-5xl">
              {tBounty('hall_title')}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-amber-100/80 md:text-lg">
              {tHome('subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {userRole === 'organizer' ? (
                <Link href="/events/new">
                  <Button className="bg-amber-500 text-stone-950 hover:bg-amber-400">{tEvents('create')}</Button>
                </Link>
              ) : null}
              <div className="rounded-full border border-amber-100/20 bg-amber-50/10 px-4 py-2 text-sm text-amber-100/80">
                {events.length} {tBounty('quest')}
              </div>
              {lockedEventCount > 0 ? (
                <div className="rounded-full border border-amber-100/20 bg-amber-50/10 px-4 py-2 text-sm text-amber-100/80">
                  {tBounty('lockedCount', { count: lockedEventCount })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {shouldShowProfilePrompt ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{tHome('profilePromptTitle')}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {tHome('profilePromptDescription')}
                </p>
              </div>
              <Link href="/profile">
                <Button variant="outline">{tHome('profilePromptAction')}</Button>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {userRole === 'guest' ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{tRecommendation('title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tRecommendation('eventIntro')}
                </p>
              </div>
              <Badge variant="outline">
                {recommendedEvents.some(({ recommendation }) => recommendation.source !== 'mock')
                  ? tRecommendation('liveLabel')
                  : tRecommendation('mockLabel')}
              </Badge>
            </div>

            <SpriteBubble message={patrolMessage} variant="info" />

            {nextUnlockCount > 0 ? (
              <SpriteBubble
                message={tSprite('nextUnlock', { count: nextUnlockCount })}
                variant="success"
              />
            ) : null}
          </div>

          {recommendedEvents.length > 0 ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              {recommendedEvents.map(({ recommendation, event }) => {
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

                return (
                  <div key={event.id} className="space-y-3">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-primary">{tRecommendation('reason')}</p>
                        <Badge>{recommendation.matchScore}% {tRecommendation('matchScore')}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {recommendation.guestFacingReason ||
                          tRecommendation(
                            recommendation.matchReasonKey,
                            localizedReasonParams,
                          )}
                      </p>
                    </div>
                    <EventCard
                      event={event}
                      hunterLevel={hunterLevel}
                      showManage={userId !== null && event.organizer_id === userId}
                      labels={{
                        eventDate: tEvents('eventDate'),
                        location: tEvents('location'),
                        maxGuests: tEvents('maxGuests'),
                        manage: tEvents('manage'),
                        audience: tEvents('audience'),
                        openAudience: tEvents('openAudience'),
                        draft: tEvents('draft'),
                        published: tEvents('published'),
                        closed: tEvents('closed'),
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
              {tRecommendation('unavailable')}
            </div>
          )}
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-16">
        {regularEvents.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {regularEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                hunterLevel={hunterLevel}
                showManage={userId !== null && event.organizer_id === userId}
                labels={{
                  eventDate: tEvents('eventDate'),
                  location: tEvents('location'),
                  maxGuests: tEvents('maxGuests'),
                  manage: tEvents('manage'),
                  audience: tEvents('audience'),
                  openAudience: tEvents('openAudience'),
                  draft: tEvents('draft'),
                  published: tEvents('published'),
                  closed: tEvents('closed'),
                }}
              />
            ))}
          </div>
        ) : events.length > 0 && userRole === 'guest' ? null : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{tBounty('hall_title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {tEvents('emptyPublished')}
            </p>
            <div className="mt-6">
              {userRole === 'organizer' ? (
                <Link href="/events/new">
                  <Button>{tEvents('create')}</Button>
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
