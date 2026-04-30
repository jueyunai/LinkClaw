import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { isProfileComplete } from '@/lib/profile-completeness';
import { SearchParamsToast } from '@/components/features/search-params-toast';
import { EventCard } from '@/components/features/event-card';
import { SpriteBubble } from '@/components/features/sprite-bubble';
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

function getPatrolMessageKey(hour: number) {
  if (hour < 10) return 'patrolMorning';
  if (hour < 18) return 'patrolAfternoon';
  return 'patrolNight';
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ profileUpdated?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profileUpdated } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role' | 'hunter_level'> | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('bio, industry, city, display_name, role, hunter_level')
      .eq('id', user.id)
      .single();
    profile = data as Pick<Profile, 'bio' | 'industry' | 'city' | 'display_name' | 'role' | 'hunter_level'> | null;
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
          { id: user?.id ?? '', display_name: profile.display_name, bio: profile.bio, industry: profile.industry, city: profile.city },
          publishedEvents,
          undefined,
          hunterLevel,
        )
      : [];
  const shouldShowProfilePrompt = user !== null && !isProfileComplete(profile);

  return (
    <HomeContent
      events={publishedEvents}
      userRole={profile?.role ?? null}
      userId={user?.id ?? null}
      recommendations={recommendations}
      shouldShowProfilePrompt={shouldShowProfilePrompt}
      hunterLevel={hunterLevel}
      profileUpdated={profileUpdated === 'true'}
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
  profileUpdated,
}: {
  events: HomeEvent[];
  userRole: UserRole | null;
  userId: string | null;
  recommendations: EventRecommendation[];
  shouldShowProfilePrompt: boolean;
  hunterLevel?: HunterLevel;
  profileUpdated?: boolean;
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
    hunterLevel === undefined ? 0 : events.filter((event) => event.bounty_rank > hunterLevel).length;
  const nextUnlockCount =
    hunterLevel === undefined || hunterLevel >= 5
      ? 0
      : events.filter((event) => event.bounty_rank === hunterLevel + 1).length;
  const patrolMessage = tSprite(getPatrolMessageKey(new Date().getHours()), {
    count: recommendations.length,
  });

  const eventLabels = {
    eventDate: tEvents('eventDate'),
    location: tEvents('location'),
    maxGuests: tEvents('maxGuests'),
    manage: tEvents('manage'),
    audience: tEvents('audience'),
    openAudience: tEvents('openAudience'),
    draft: tEvents('draft'),
    published: tEvents('published'),
    closed: tEvents('closed'),
  };

  return (
    <main
      className="min-h-[calc(100vh-4rem)]"
      style={{ background: 'linear-gradient(180deg, #f5ead6 0%, #f8f2e4 40%, #f5ead6 100%)' }}
    >
      {profileUpdated ? (
        <SearchParamsToast
          success="profileUpdated"
          successMessages={{ profileUpdated: tHome('profileUpdatedSuccess') }}
        />
      ) : null}
      {/* ═══════════════════════════════════════════════
          GUILD ANNOUNCEMENT BOARD — Hero Header
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Dark mahogany board */}
        <div
          className="relative"
          style={{
            background: 'linear-gradient(180deg, #1e0e04 0%, #2e1508 50%, #3d1f0a 100%)',
            boxShadow: '0 8px 40px rgba(30,14,4,0.6)',
          }}
        >
          {/* Top gold rule */}
          <div
            className="h-[3px]"
            style={{ background: 'linear-gradient(90deg, #3d1f0a 0%, #c8922a 15%, #f0c060 50%, #c8922a 85%, #3d1f0a 100%)' }}
          />

          {/* Corner ornaments */}
          <div className="absolute left-6 top-6 text-[#c8922a]/40 text-3xl select-none" aria-hidden>✦</div>
          <div className="absolute right-6 top-6 text-[#c8922a]/40 text-3xl select-none" aria-hidden>✦</div>
          <div className="absolute left-6 bottom-6 text-[#c8922a]/30 text-2xl select-none" aria-hidden>◆</div>
          <div className="absolute right-6 bottom-6 text-[#c8922a]/30 text-2xl select-none" aria-hidden>◆</div>

          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(200,146,42,0.12) 0%, transparent 70%)' }}
          />

          <div className="relative mx-auto max-w-6xl px-8 py-12 md:py-16">
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:text-left">

              {/* Wax seal — left accent */}
              <div
                className="wax-seal-enter shrink-0 hidden md:flex flex-col items-center gap-2"
              >
                <div
                  className="flex size-20 items-center justify-center rounded-full text-3xl"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #c8922a, #7a4a10)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,220,120,0.3), inset 0 -2px 0 rgba(0,0,0,0.3)',
                    border: '3px solid rgba(200,146,42,0.4)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 4 L18 14 L28 16 L18 18 L16 28 L14 18 L4 16 L14 14 Z" fill="#2a1206" opacity="0.9"/>
                    <path d="M16 2 L18.5 13.5 L30 16 L18.5 18.5 L16 30 L13.5 18.5 L2 16 L13.5 13.5 Z" fill="none" stroke="#2a1206" strokeWidth="1" opacity="0.4"/>
                  </svg>
                </div>
                <div
                  className="text-[0.55rem] uppercase tracking-[0.3em]"
                  style={{ color: '#c8922a' }}
                >
                  Official
                </div>
              </div>

              {/* Main title block */}
              <div className="flex-1 space-y-4">
                {/* Eyebrow */}
                <p
                  className="guild-reveal guild-reveal-1 text-[0.6rem] uppercase tracking-[0.5em]"
                  style={{ color: '#c8922a' }}
                >
                  {tBounty('hallBanner')}
                </p>

                {/* Main title */}
                <h1
                  className="guild-reveal guild-reveal-2 text-4xl font-bold leading-none tracking-wide md:text-5xl lg:text-6xl"
                  style={{
                    fontFamily: 'var(--font-cinzel)',
                    color: '#f0c060',
                    textShadow: '0 0 30px rgba(240,192,96,0.3), 0 2px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  {tBounty('hall_title')}
                </h1>

                {/* Decorative rule */}
                <div
                  className="guild-reveal guild-reveal-3 mx-auto h-[1px] w-48 md:mx-0"
                  style={{ background: 'linear-gradient(90deg, transparent, #c8922a, transparent)' }}
                />

                {/* Subtitle */}
                <p
                  className="guild-reveal guild-reveal-3 max-w-xl text-base leading-relaxed md:text-lg"
                  style={{ color: '#c8b090', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
                >
                  {tHome('subtitle')}
                </p>

                {/* Stats row */}
                <div className="guild-reveal guild-reveal-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <StatPill value={String(events.length)} label={tBounty('quest')} />
                  {lockedEventCount > 0 ? (
                    <StatPill value={String(lockedEventCount)} label={tBounty('lockedCount', { count: lockedEventCount })} locked />
                  ) : null}
                  {userRole === 'organizer' ? (
                    <Link href="/events/new">
                      <button
                        className="rounded px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: 'linear-gradient(135deg, #c8922a, #a07020)',
                          color: '#1e0e04',
                          fontFamily: 'var(--font-cinzel)',
                          boxShadow: '0 3px 12px rgba(200,146,42,0.4)',
                        }}
                      >
                        {tEvents('create')}
                      </button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gold rule */}
          <div
            className="h-[2px]"
            style={{ background: 'linear-gradient(90deg, #3d1f0a 0%, #c8922a 15%, #f0c060 50%, #c8922a 85%, #3d1f0a 100%)' }}
          />
        </div>

        {/* Torn edge effect */}
        <div
          className="h-4 w-full"
          style={{
            background: 'linear-gradient(180deg, #3d1f0a 0%, transparent 100%)',
            maskImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'16\'%3E%3Cpath d=\'M0 0 Q5 16 10 8 Q15 0 20 12 Q25 16 30 6 Q35 0 40 14 Q45 16 50 4 Q55 0 60 12 Q65 16 70 6 Q75 0 80 14 Q85 16 90 8 Q95 0 100 10 L100 0 Z\' fill=\'black\'/%3E%3C/svg%3E")',
            maskSize: '100px 16px',
            maskRepeat: 'repeat-x',
          }}
        />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">

        {/* Profile completion prompt */}
        {shouldShowProfilePrompt ? (
          <div
            className="guild-reveal guild-reveal-1 rounded p-5"
            style={{
              background: 'linear-gradient(135deg, #fdf8f0, #f8f0e0)',
              border: '1px solid rgba(200,146,42,0.3)',
              boxShadow: '0 2px 12px rgba(61,31,10,0.08)',
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-cinzel)', color: '#3d2010' }}
                >
                  {tHome('profilePromptTitle')}
                </h2>
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
                >
                  {tHome('profilePromptDescription')}
                </p>
              </div>
              <Link href="/profile?from=home">
                <button
                  className="shrink-0 rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:brightness-110"
                  style={{
                    background: 'rgba(200,146,42,0.12)',
                    color: '#8b5e1a',
                    border: '1px solid rgba(200,146,42,0.3)',
                    fontFamily: 'var(--font-cinzel)',
                  }}
                >
                  {tHome('profilePromptAction')}
                </button>
              </Link>
            </div>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════
            SPRITE SCOUT SECTION — Recommended quests
        ═══════════════════════════════════════════════ */}
        {userRole === 'guest' ? (
          <section className="space-y-6">
            {/* Section header */}
            <SectionHeader
              title={tRecommendation('title')}
              subtitle={tRecommendation('eventIntro')}
              badge={
                recommendedEvents.some(({ recommendation }) => recommendation.source !== 'mock')
                  ? tRecommendation('liveLabel')
                  : tRecommendation('mockLabel')
              }
            />

            {/* Sprite bubbles */}
            <div className="space-y-3">
              <SpriteBubble message={patrolMessage} variant="info" />
              {nextUnlockCount > 0 ? (
                <SpriteBubble
                  message={tSprite('nextUnlock', { count: nextUnlockCount })}
                  variant="success"
                />
              ) : null}
            </div>

            {/* Recommended cards */}
            {recommendedEvents.length > 0 ? (
              <div className="grid gap-x-5 gap-y-3 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
                {recommendedEvents.map(({ recommendation, event }, i) => {
                  const localizedReasonParams: Record<string, string | number | Date> | undefined =
                    recommendation.matchReasonParams?.keywords
                      ? { keywords: recommendation.matchReasonParams.keywords.join(keywordSeparator) }
                      : recommendation.matchReasonParams?.value
                        ? { value: recommendation.matchReasonParams.value }
                        : undefined;

                  return (
                    <div
                      key={event.id}
                      className="guild-reveal grid grid-rows-subgrid gap-3 lg:row-span-2"
                      style={{ animationDelay: `${0.05 + i * 0.08}s` }}
                    >
                      {/* Recommendation reason card */}
                      <div
                        className="flex flex-col rounded p-3"
                        style={{
                          background: 'linear-gradient(135deg, rgba(200,146,42,0.08), rgba(200,146,42,0.04))',
                          border: '1px solid rgba(200,146,42,0.2)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-[0.6rem] font-semibold uppercase tracking-[0.2em]"
                            style={{ color: '#c8922a', fontFamily: 'var(--font-cinzel)' }}
                          >
                            {tRecommendation('reason')}
                          </p>
                          <span
                            className="shrink-0 rounded px-2 py-0.5 text-[0.6rem] font-bold"
                            style={{
                              background: 'rgba(200,146,42,0.15)',
                              color: '#8b5e1a',
                              border: '1px solid rgba(200,146,42,0.25)',
                              fontFamily: 'var(--font-cinzel)',
                            }}
                          >
                            {recommendation.matchScore}%
                          </span>
                        </div>
                        <p
                          className="mt-1.5 text-sm leading-relaxed"
                          style={{ color: '#5a3a20', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
                        >
                          {recommendation.guestFacingReason ||
                            tRecommendation(recommendation.matchReasonKey, localizedReasonParams)}
                        </p>
                      </div>

                      <EventCard
                        event={event}
                        hunterLevel={hunterLevel}
                        showManage={userId !== null && event.organizer_id === userId}
                        labels={eventLabels}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message={tRecommendation('unavailable')} />
            )}
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════
            ALL QUESTS BOARD
        ═══════════════════════════════════════════════ */}
        <section className="space-y-6">
          {regularEvents.length > 0 ? (
            <>
              {userRole === 'guest' && recommendedEvents.length > 0 ? (
                <SectionHeader
                  title={tBounty('allQuests')}
                  subtitle=""
                />
              ) : null}
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {regularEvents.map((event, i) => (
                  <div
                    key={event.id}
                    className="guild-reveal"
                    style={{ animationDelay: `${0.05 + i * 0.06}s` }}
                  >
                    <EventCard
                      event={event}
                      hunterLevel={hunterLevel}
                      showManage={userId !== null && event.organizer_id === userId}
                      labels={eventLabels}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : events.length > 0 && userRole === 'guest' ? null : (
            <EmptyBoard
              title={tBounty('hall_title')}
              message={tEvents('emptyPublished')}
              action={
                userRole === 'organizer' ? (
                  <Link href="/events/new">
                    <button
                      className="rounded px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110"
                      style={{
                        background: 'linear-gradient(135deg, #c8922a, #a07020)',
                        color: '#1e0e04',
                        fontFamily: 'var(--font-cinzel)',
                        boxShadow: '0 3px 12px rgba(200,146,42,0.3)',
                      }}
                    >
                      {tEvents('create')}
                    </button>
                  </Link>
                ) : null
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatPill({ value, label, locked }: { value: string; label: string; locked?: boolean }) {
  return (
    <div
      className="flex items-center gap-2 rounded px-3 py-1.5"
      style={{
        background: locked ? 'rgba(138,112,96,0.15)' : 'rgba(200,146,42,0.12)',
        border: locked ? '1px solid rgba(138,112,96,0.25)' : '1px solid rgba(200,146,42,0.25)',
      }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: locked ? '#8a7060' : '#f0c060', fontFamily: 'var(--font-cinzel)' }}
      >
        {value}
      </span>
      <span
        className="text-[0.65rem] uppercase tracking-[0.15em]"
        style={{ color: locked ? '#6a5040' : '#c8922a' }}
      >
        {label}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2
          className="text-xl font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-cinzel)', color: '#3d2010' }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className="mt-1 text-sm"
            style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {badge ? (
        <span
          className="shrink-0 rounded px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em]"
          style={{
            background: 'rgba(200,146,42,0.1)',
            color: '#c8922a',
            border: '1px solid rgba(200,146,42,0.25)',
            fontFamily: 'var(--font-cinzel)',
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded p-8 text-center"
      style={{
        background: 'rgba(245,234,210,0.5)',
        border: '1px dashed rgba(180,140,80,0.4)',
      }}
    >
      <p
        className="text-sm"
        style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
      >
        {message}
      </p>
    </div>
  );
}

function EmptyBoard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded p-10 text-center"
      style={{
        background: 'linear-gradient(160deg, #fdf8f0, #f8f0e0)',
        border: '1px dashed rgba(180,140,80,0.4)',
        boxShadow: 'inset 0 2px 8px rgba(61,31,10,0.04)',
      }}
    >
      <div className="flex justify-center mb-4 opacity-40">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="24" height="28" rx="2" stroke="#8a7060" strokeWidth="1.5" fill="none"/>
          <line x1="13" y1="13" x2="27" y2="13" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="13" y1="18" x2="27" y2="18" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="13" y1="23" x2="22" y2="23" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-cinzel)', color: '#3d2010' }}
      >
        {title}
      </h2>
      <p
        className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
        style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
      >
        {message}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
