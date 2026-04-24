import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { HUNTER_LEVEL_META, type BountyRank, type HunterLevel } from '@/types/database';

export function getHunterRankTranslationKey(level: HunterLevel | BountyRank) {
  return `level_${HUNTER_LEVEL_META[level].key}` as const;
}

// Rank-specific icons as unicode symbols for zero-dependency elegance
const RANK_SYMBOLS: Record<number, string> = {
  1: '◆', // Bronze
  2: '◈', // Silver
  3: '✦', // Gold
  4: '❋', // Platinum
  5: '✸', // Diamond
  6: '★', // Legend
};

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
  const symbol = RANK_SYMBOLS[level] ?? '◆';

  const baseStyle: React.CSSProperties = {
    color: meta.color,
    backgroundColor: `${meta.color}18`,
    borderColor: `${meta.color}50`,
    fontFamily: 'var(--font-cinzel)',
  };

  if (isLegend) {
    baseStyle.boxShadow = `0 0 10px ${meta.color}55, 0 0 20px ${meta.color}22`;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-semibold uppercase',
        size === 'sm'
          ? 'px-2 py-0.5 text-[0.58rem] tracking-[0.2em]'
          : 'px-3 py-1 text-[0.7rem] tracking-[0.25em]',
        isLegend && 'animate-pulse',
        className,
      )}
      style={baseStyle}
    >
      <span className={size === 'sm' ? 'text-[0.65rem]' : 'text-[0.8rem]'}>{symbol}</span>
      <span>{label}</span>
    </span>
  );
}

// Large profile variant — used on profile page
export function RankBadgeLarge({
  level,
  className,
}: {
  level: HunterLevel;
  className?: string;
}) {
  const tHunter = useTranslations('hunter');
  const meta = HUNTER_LEVEL_META[level];
  const label = tHunter(getHunterRankTranslationKey(level));
  const isLegend = level === 6;
  const symbol = RANK_SYMBOLS[level] ?? '◆';

  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
    >
      {/* Shield emblem */}
      <div
        className={cn(
          'relative flex size-20 items-center justify-center rounded-full',
          isLegend && 'animate-pulse',
        )}
        style={{
          background: `radial-gradient(circle at 35% 30%, ${meta.color}40, ${meta.color}15)`,
          border: `2px solid ${meta.color}70`,
          boxShadow: isLegend
            ? `0 0 20px ${meta.color}60, 0 0 40px ${meta.color}25, inset 0 1px 0 ${meta.color}40`
            : `0 4px 16px ${meta.color}30, inset 0 1px 0 ${meta.color}30`,
        }}
      >
        <span style={{ fontSize: '2rem', color: meta.color }}>{symbol}</span>
      </div>
      <div className="text-center">
        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: meta.color, fontFamily: 'var(--font-cinzel)' }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 text-[0.65rem] uppercase tracking-[0.2em] opacity-60"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          Hunter
        </p>
      </div>
    </div>
  );
}
