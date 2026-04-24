import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { RankBadge } from '@/components/features/rank-badge';
import { cn } from '@/lib/utils';
import { HUNTER_LEVEL_META, type BountyRank, type EventStatus, type HunterLevel } from '@/types/database';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    location: string;
    event_date: string;
    max_guests: number;
    status: EventStatus;
    target_audience: string | null;
    bounty_rank?: BountyRank;
  };
  labels: {
    eventDate: string;
    location: string;
    maxGuests: string;
    manage: string;
    audience: string;
    openAudience: string;
    draft: string;
    published: string;
    closed: string;
  };
  hunterLevel?: HunterLevel;
  showManage?: boolean;
}

const statusConfig: Record<EventStatus, { label: (labels: EventCardProps['labels']) => string; color: string; bg: string }> = {
  draft: {
    label: (l) => l.draft,
    color: '#8a7060',
    bg: 'rgba(138,112,96,0.12)',
  },
  published: {
    label: (l) => l.published,
    color: '#c8922a',
    bg: 'rgba(200,146,42,0.12)',
  },
  closed: {
    label: (l) => l.closed,
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
};

export function EventCard({ event, labels, hunterLevel, showManage = false }: EventCardProps) {
  const locale = useLocale();
  const tBounty = useTranslations('bounty');
  const tHunter = useTranslations('hunter');

  const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.event_date));

  const rankMeta = event.bounty_rank ? HUNTER_LEVEL_META[event.bounty_rank] : null;
  const isLocked =
    hunterLevel !== undefined &&
    event.bounty_rank !== undefined &&
    hunterLevel < event.bounty_rank;
  const requiredRankLabel =
    event.bounty_rank !== undefined
      ? tHunter(`level_${HUNTER_LEVEL_META[event.bounty_rank].key}`)
      : null;
  const status = statusConfig[event.status];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded transition-all duration-300',
        isLocked
          ? 'opacity-60 hover:opacity-75'
          : 'hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(61,31,10,0.18)]',
      )}
      style={{
        background: 'linear-gradient(160deg, #fdf8f0 0%, #f8f0e0 100%)',
        border: rankMeta
          ? `1px solid ${rankMeta.color}45`
          : '1px solid rgba(180,140,80,0.25)',
        boxShadow: rankMeta
          ? `0 2px 12px ${rankMeta.color}18, inset 0 1px 0 rgba(255,240,180,0.4)`
          : '0 2px 8px rgba(61,31,10,0.07), inset 0 1px 0 rgba(255,240,180,0.3)',
      }}
    >
      {/* Rank color bar — left edge */}
      {rankMeta ? (
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{
            background: `linear-gradient(180deg, ${rankMeta.color}cc, ${rankMeta.color}66)`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {/* Lock overlay */}
      {isLocked ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded"
          style={{ background: 'rgba(245,234,210,0.15)', backdropFilter: 'blur(0.5px)' }}
        >
          <div
            className="flex flex-col items-center gap-1.5 rounded-lg px-4 py-3"
            style={{
              background: 'rgba(245,234,210,0.92)',
              border: '1px solid rgba(200,146,42,0.3)',
              boxShadow: '0 4px 16px rgba(61,31,10,0.12)',
            }}
          >
            <span className="text-2xl">🔒</span>
            {requiredRankLabel ? (
              <p
                className="text-center text-[0.65rem] uppercase tracking-[0.2em]"
                style={{ color: '#8b5e1a', fontFamily: 'var(--font-cinzel)' }}
              >
                {tBounty('rank_required')} {requiredRankLabel}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Card body */}
      <div className="pl-4">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {/* Status badge */}
            <span
              className="inline-flex items-center rounded px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
              style={{
                color: status.color,
                background: status.bg,
                border: `1px solid ${status.color}30`,
                fontFamily: 'var(--font-cinzel)',
              }}
            >
              {status.label(labels)}
            </span>

            {/* Rank badge */}
            {event.bounty_rank ? <RankBadge level={event.bounty_rank} /> : null}
          </div>

          {/* Title */}
          <h3
            className="text-lg font-semibold leading-snug text-[#2a1206] group-hover:text-[#8b5e1a] transition-colors"
            style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1rem' }}
          >
            {event.title}
          </h3>

          {/* Description */}
          <p
            className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#5a3a20]/80"
            style={{ fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
          >
            {event.description}
          </p>
        </div>

        {/* Divider */}
        <div
          className="mx-4"
          style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(180,140,80,0.3), transparent)' }}
        />

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-0 px-4 py-3">
          <MetaItem label={labels.eventDate} value={date} />
          <MetaItem label={labels.location} value={event.location} />
          <MetaItem label={labels.maxGuests} value={String(event.max_guests)} />
          <MetaItem
            label={labels.audience}
            value={event.target_audience || labels.openAudience}
            muted
          />
        </div>

        {/* Footer */}
        {showManage ? (
          <>
            <div
              className="mx-4"
              style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(180,140,80,0.3), transparent)' }}
            />
            <div className="flex justify-end px-4 py-3">
              <Link href={`/events/${event.id}/manage`}>
                <button
                  className="rounded px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #c8922a, #a07020)',
                    color: '#2a1206',
                    fontFamily: 'var(--font-cinzel)',
                    boxShadow: '0 2px 8px rgba(200,146,42,0.25)',
                  }}
                >
                  {labels.manage}
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="px-4 pb-4">
            <Link href={`/events/${event.id}`}>
              <button
                className="w-full rounded py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: isLocked
                    ? 'rgba(138,112,96,0.15)'
                    : 'linear-gradient(135deg, rgba(200,146,42,0.15), rgba(200,146,42,0.08))',
                  color: isLocked ? '#8a7060' : '#8b5e1a',
                  border: isLocked ? '1px solid rgba(138,112,96,0.2)' : '1px solid rgba(200,146,42,0.3)',
                  fontFamily: 'var(--font-cinzel)',
                }}
              >
                {isLocked ? tBounty('rank_required') : tBounty('claim')}
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="py-1 pr-2">
      <p
        className="text-[0.58rem] uppercase tracking-[0.18em] text-[#8a7060]"
        style={{ fontFamily: 'var(--font-cinzel)' }}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-[0.82rem] font-medium leading-snug',
          muted ? 'text-[#8a7060]' : 'text-[#3d2010]',
        )}
        style={{ fontFamily: 'var(--font-crimson)' }}
      >
        {value}
      </p>
    </div>
  );
}
