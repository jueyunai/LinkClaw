import { Shield, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HUNTER_LEVEL_META, type BountyRank, type HunterLevel } from '@/types/database';

export function getHunterRankTranslationKey(level: HunterLevel | BountyRank) {
  return `level_${HUNTER_LEVEL_META[level].key}` as const;
}

export function RankBadge({
  level,
  size = 'sm',
  className,
}: {
  level: HunterLevel | BountyRank;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const tHunter = useTranslations('hunter');
  const meta = HUNTER_LEVEL_META[level];
  const label = tHunter(getHunterRankTranslationKey(level));
  const isLegend = level === 6;

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-current/20 bg-transparent font-semibold uppercase tracking-[0.22em] shadow-sm backdrop-blur-sm',
        size === 'sm' ? 'gap-1 px-2.5 py-1 text-[0.65rem]' : 'gap-2 px-4 py-2 text-xs',
        isLegend && 'animate-pulse shadow-[0_0_18px_rgba(255,107,53,0.25)]',
        className,
      )}
      style={{
        color: meta.color,
        backgroundColor: `${meta.color}18`,
        borderColor: `${meta.color}55`,
      }}
    >
      {isLegend ? (
        <Sparkles className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      ) : (
        <Shield className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      )}
      <span>{label}</span>
    </Badge>
  );
}
