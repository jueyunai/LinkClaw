import { useLocale } from 'next-intl';
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
import type { EventStatus } from '@/types/database';

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
}

const statusVariantMap: Record<EventStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
};

export function EventCard({ event, labels }: EventCardProps) {
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.event_date));

  const statusLabel = labels[event.status];

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant={statusVariantMap[event.status]}>{statusLabel}</Badge>
            <CardTitle className="text-xl leading-tight">{event.title}</CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-3 text-sm leading-6">
          {event.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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

      <CardFooter className="justify-between gap-3">
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {event.target_audience || event.description}
        </p>
        <Link href={`/events/${event.id}`}>
          <Button size="sm">{labels.manage}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
