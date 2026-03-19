import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

const statusVariantMap: Record<EventStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
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

  const statusLabel = labels[event.status];
  const rankMeta = event.bounty_rank ? HUNTER_LEVEL_META[event.bounty_rank] : null;
  const isLocked =
    hunterLevel !== undefined &&
    event.bounty_rank !== undefined &&
    hunterLevel < event.bounty_rank;
  const requiredRankLabel =
    event.bounty_rank !== undefined
      ? tHunter(`level_${HUNTER_LEVEL_META[event.bounty_rank].key}`)
      : null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/60 bg-card/80 shadow-sm transition-all duration-300',
        isLocked ? 'opacity-75 hover:shadow-lg' : 'hover:-translate-y-1 hover:shadow-xl',
      )}
    >
      {rankMeta ? (
        <div
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: rankMeta.color }}
          aria-hidden="true"
        />
      ) : null}

      <CardHeader className="gap-3 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariantMap[event.status]}>{statusLabel}</Badge>
              {event.bounty_rank ? <RankBadge level={event.bounty_rank} /> : null}
            </div>
            <CardTitle className="text-xl leading-tight">{event.title}</CardTitle>
          </div>
          {isLocked ? (
            <div className="rounded-full border border-amber-300/50 bg-amber-100/80 p-2 text-amber-900 shadow-sm">
              <Lock className="size-4" />
            </div>
          ) : null}
        </div>
        <CardDescription className="line-clamp-3 text-sm leading-6">
          {event.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pl-6">
        {isLocked && requiredRankLabel ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">{tBounty('rank_required')}</span>
            <span className="ml-2">{requiredRankLabel}</span>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {labels.eventDate}
            </p>
            <p className="mt-1 text-sm font-medium">{date}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {labels.location}
            </p>
            <p className="mt-1 text-sm font-medium">{event.location}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {labels.maxGuests}
            </p>
            <p className="mt-1 text-sm font-medium">{event.max_guests}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {labels.audience}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-muted-foreground">
              {event.target_audience || labels.openAudience}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-3 pl-6">
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {isLocked && requiredRankLabel
            ? tBounty('locked_card_hint', { rank: requiredRankLabel })
            : event.target_audience || event.description}
        </p>
        {showManage ? (
          <Link href={`/events/${event.id}/manage`}>
            <Button size="sm">{labels.manage}</Button>
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  );
}
