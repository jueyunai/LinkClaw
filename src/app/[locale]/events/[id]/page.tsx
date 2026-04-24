import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { RankBadge } from '@/components/features/rank-badge';
import { SpriteBubble } from '@/components/features/sprite-bubble';
import { BackButton } from '@/components/ui/back-button';
import { createClient } from '@/lib/supabase/server';
import { applyToEvent } from '@/app/[locale]/registrations/actions';
import { HUNTER_LEVEL_META } from '@/types/database';
import type {
  BountyRank,
  EventStatus,
  HunterLevel,
  RegistrationStatus,
  RegistrationType,
  UserRole,
} from '@/types/database';


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
  bounty_rank: BountyRank;
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

function getSpriteEvaluationKey(levelDiff: number) {
  if (levelDiff >= 2) {
    return 'eval_easy';
  }

  if (levelDiff === 1) {
    return 'eval_comfortable';
  }

  if (levelDiff === 0) {
    return 'eval_matched';
  }

  if (levelDiff === -1) {
    return 'eval_challenging';
  }

  return 'eval_locked';
}

function getSpriteVariant(levelDiff: number) {
  if (levelDiff >= 0) {
    return 'success' as const;
  }

  return 'warning' as const;
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
    .select('id, organizer_id, title, description, target_audience, event_date, location, max_guests, status, bounty_rank')
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

  let profile: { role: UserRole; hunter_level: HunterLevel } | null = null;
  let registration: EventRegistration | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, hunter_level')
      .eq('id', user.id)
      .single();

    profile = profileData as { role: UserRole; hunter_level: HunterLevel } | null;

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
      hunterLevel={profile?.hunter_level}
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
  hunterLevel,
  registration,
  error,
  success,
}: {
  event: EventDetailEvent;
  organizer: OrganizerProfile | null;
  currentUserId: string | null;
  currentUserRole: UserRole | null;
  hunterLevel?: HunterLevel;
  registration: EventRegistration | null;
  error?: string;
  success?: string;
}) {
  const tEvents = useTranslations('events');
  const tProfile = useTranslations('profile');
  const tBounty = useTranslations('bounty');
  const tSprite = useTranslations('sprite');
  const locale = useLocale();
  const isOwner = currentUserId === event.organizer_id;
  const isGuest = currentUserRole === 'guest';
  const isLocked = isGuest && hunterLevel !== undefined && hunterLevel < event.bounty_rank;
  const canApply = isGuest && !registration && event.status === 'published' && !isLocked;
  const showLoginToApply = !currentUserId && event.status === 'published';
  const levelDiff = hunterLevel === undefined ? 0 : hunterLevel - event.bounty_rank;
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
  const spriteMessage = tSprite(getSpriteEvaluationKey(levelDiff));
  const rankMeta = HUNTER_LEVEL_META[event.bounty_rank];

  return (
    <main
      className="min-h-[calc(100vh-4rem)]"
      style={{ background: 'linear-gradient(180deg, #f5ead6 0%, #f8f2e4 100%)' }}
    >
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {/* Back link */}
        <BackButton />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          {/* Main content */}
          <div className="space-y-5">
            {/* Title card */}
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                background: 'linear-gradient(160deg, #fdf8f0 0%, #f8f0e0 100%)',
                border: '1px solid rgba(180,140,80,0.3)',
                boxShadow: '0 4px 24px rgba(61,31,10,0.1), inset 0 1px 0 rgba(255,240,180,0.4)',
              }}
            >
              {/* Rank color bar */}
              <div
                className="absolute inset-y-0 left-0 w-1"
                style={{
                  background: `linear-gradient(180deg, ${rankMeta?.color ?? '#c8922a'}cc, ${rankMeta?.color ?? '#c8922a'}44)`,
                }}
              />

              <div className="pl-5 pr-6 pt-6 pb-6">
                {/* Status + rank */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em]"
                    style={{
                      background: 'rgba(200,146,42,0.12)',
                      color: '#c8922a',
                      border: '1px solid rgba(200,146,42,0.25)',
                      fontFamily: 'var(--font-cinzel)',
                    }}
                  >
                    {tEvents(event.status)}
                  </span>
                  <RankBadge level={event.bounty_rank} />
                </div>

                {/* Title */}
                <h1
                  className="text-3xl font-bold leading-tight md:text-4xl"
                  style={{ fontFamily: 'var(--font-cinzel)', color: '#2a1206' }}
                >
                  {event.title}
                </h1>

                {/* Divider */}
                <div
                  className="my-4 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, rgba(180,140,80,0.4), transparent)' }}
                />

                {/* Description */}
                <p
                  className="text-base leading-relaxed"
                  style={{ color: '#5a3a20', fontFamily: 'var(--font-crimson)', fontStyle: 'italic', fontSize: '1.05rem' }}
                >
                  {event.description}
                </p>

                {/* Alerts */}
                {error ? (
                  <div
                    className="mt-4 rounded px-4 py-3 text-sm"
                    style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)', color: '#7f1d1d' }}
                  >
                    {error}
                  </div>
                ) : null}
                {success === 'applied' ? (
                  <div
                    className="mt-4 rounded px-4 py-3 text-sm"
                    style={{ background: 'rgba(200,146,42,0.1)', border: '1px solid rgba(200,146,42,0.25)', color: '#8b5e1a' }}
                  >
                    {tEvents('applied')}
                  </div>
                ) : null}

                {/* Meta grid */}
                <div
                  className="mt-5 grid gap-4 rounded-lg p-5 md:grid-cols-3"
                  style={{ background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(180,140,80,0.2)' }}
                >
                  <MetaField label={tEvents('eventDate')} value={date} />
                  <MetaField label={tEvents('location')} value={event.location} />
                  <MetaField label={tEvents('maxGuests')} value={String(event.max_guests)} />
                </div>

                {/* Target audience */}
                <div
                  className="mt-4 rounded-lg p-5"
                  style={{ background: 'rgba(245,234,210,0.5)', border: '1px solid rgba(180,140,80,0.2)' }}
                >
                  <p
                    className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.25em]"
                    style={{ color: '#8a7060', fontFamily: 'var(--font-cinzel)' }}
                  >
                    {tEvents('targetAudience')}
                  </p>
                  <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ color: '#5a3a20', fontFamily: 'var(--font-crimson)' }}
                  >
                    {event.target_audience || tEvents('targetAudiencePlaceholder')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Sprite evaluation */}
            {isGuest ? (
              <SpriteBubble message={spriteMessage} variant={getSpriteVariant(levelDiff)} />
            ) : null}

            {/* Organizer + action card */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #fdf8f0 0%, #f8f0e0 100%)',
                border: '1px solid rgba(180,140,80,0.3)',
                boxShadow: '0 4px 20px rgba(61,31,10,0.08), inset 0 1px 0 rgba(255,240,180,0.3)',
              }}
            >
              {/* Organizer header */}
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid rgba(180,140,80,0.2)' }}
              >
                <p
                  className="mb-3 text-[0.58rem] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: '#8a7060', fontFamily: 'var(--font-cinzel)' }}
                >
                  {tProfile('organizerProfile')}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #c8922a, #8b5e1a)',
                      color: '#2a1206',
                      fontFamily: 'var(--font-cinzel)',
                    }}
                  >
                    {organizerInitial}
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: '#3d2010', fontFamily: 'var(--font-cinzel)' }}
                    >
                      {organizerName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: '#8a7060', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
                    >
                      {organizer?.industry || tProfile('organizerRoleFallback')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Organizer bio */}
              <div className="px-5 py-4 space-y-3">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#5a3a20', fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
                >
                  {organizer?.bio || tProfile('organizerBioFallback')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MetaField label={tProfile('industry')} value={organizer?.industry || '-'} small />
                  <MetaField label={tProfile('city')} value={organizer?.city || '-'} small />
                </div>
              </div>

              {/* Locked warning */}
              {isLocked ? (
                <div
                  className="mx-5 mb-4 rounded px-4 py-3 text-sm"
                  style={{
                    background: 'rgba(185,28,28,0.06)',
                    border: '1px solid rgba(185,28,28,0.2)',
                    color: '#7f1d1d',
                    fontFamily: 'var(--font-crimson)',
                    fontStyle: 'italic',
                  }}
                >
                  {tBounty('rank_required_detail')}
                </div>
              ) : null}

              {/* Action buttons */}
              <div
                className="flex flex-wrap gap-3 px-5 py-4"
                style={{ borderTop: '1px solid rgba(180,140,80,0.2)' }}
              >
                {isOwner ? (
                  <Link href={`/events/${event.id}/manage`}>
                    <GuildButton>{tEvents('manage')}</GuildButton>
                  </Link>
                ) : canApply ? (
                  <form action={applyToEvent}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <GuildButton type="submit">{tBounty('claim')}</GuildButton>
                  </form>
                ) : registrationLabel ? (
                  <GuildButton disabled>{registrationLabel}</GuildButton>
                ) : showLoginToApply ? (
                  <Link href={`/auth/login?redirect=/events/${event.id}`}>
                    <GuildButton>{tBounty('claim')}</GuildButton>
                  </Link>
                ) : (
                  <GuildButton disabled>{tBounty('claim')}</GuildButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetaField({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p
        className="text-[0.58rem] font-semibold uppercase tracking-[0.2em]"
        style={{ color: '#8a7060', fontFamily: 'var(--font-cinzel)' }}
      >
        {label}
      </p>
      <p
        className={small ? 'mt-0.5 text-sm' : 'mt-1 text-sm font-medium'}
        style={{ color: '#3d2010', fontFamily: 'var(--font-crimson)' }}
      >
        {value}
      </p>
    </div>
  );
}

function GuildButton({
  children,
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="rounded px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: disabled ? 'rgba(138,112,96,0.15)' : 'linear-gradient(135deg, #c8922a, #a07020)',
        color: disabled ? '#8a7060' : '#1e0e04',
        border: disabled ? '1px solid rgba(138,112,96,0.2)' : 'none',
        fontFamily: 'var(--font-cinzel)',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(200,146,42,0.3)',
      }}
    >
      {children}
    </button>
  );
}
