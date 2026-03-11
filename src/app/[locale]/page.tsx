import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EventCard } from '@/components/features/event-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getMockEventRecommendations } from '@/lib/ai/mock-recommendation';
import type { EventStatus, Profile, UserRole } from '@/types/database';

interface HomeEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  max_guests: number;
  status: EventStatus;
  target_audience: string | null;
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

  let profile: Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role'> | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('bio, industry, city, display_name, role')
      .eq('id', user.id)
      .single();

    profile = data as Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role'> | null;
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, location, event_date, max_guests, status, target_audience')
    .eq('status', 'published')
    .order('event_date', { ascending: true });

  const publishedEvents = (events ?? []) as HomeEvent[];
  const recommendations =
    profile && profile.role === 'guest'
      ? getMockEventRecommendations(profile, publishedEvents)
      : [];

  return (
    <HomeContent
      events={publishedEvents}
      userRole={profile?.role ?? null}
      recommendations={recommendations}
    />
  );
}

function HomeContent({
  events,
  userRole,
  recommendations,
}: {
  events: HomeEvent[];
  userRole: UserRole | null;
  recommendations: Array<{
    eventId: string;
    matchScore: number;
    matchReasonKey:
      | 'reasonIndustry'
      | 'reasonCity'
      | 'reasonAudience'
      | 'reasonKeywords'
      | 'reasonFallback';
    matchReasonParams?: {
      value?: string;
      keywords?: string[];
    };
  }>;
}) {
  const tHome = useTranslations('home');
  const tEvents = useTranslations('events');
  const tRecommendation = useTranslations('recommendation');
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

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 px-6 py-10 shadow-xl backdrop-blur md:px-10 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.12),transparent_28%)]" />
          <div className="relative max-w-3xl space-y-5">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-primary/80">
              {tHome('liveBoard')}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {tHome('title')}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {tHome('subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {userRole === 'organizer' ? (
                <Link href="/events/new">
                  <Button>{tEvents('create')}</Button>
                </Link>
              ) : null}
              <div className="rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
                {events.length} {tEvents('published')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {userRole === 'guest' ? (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{tRecommendation('title')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tRecommendation('eventIntro')}
              </p>
            </div>
            <Badge variant="outline">{tRecommendation('mockLabel')}</Badge>
          </div>

          {recommendedEvents.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
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
                        {tRecommendation(
                          recommendation.matchReasonKey,
                          localizedReasonParams,
                        )}
                      </p>
                    </div>
                    <EventCard
                      event={event}
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
            <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
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
            <h2 className="text-2xl font-semibold tracking-tight">{tEvents('title')}</h2>
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
