import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const variantConfig = {
  info: {
    bg: 'linear-gradient(135deg, #fdf6e3 0%, #faefd0 100%)',
    border: 'rgba(200,146,42,0.35)',
    shadow: 'rgba(200,146,42,0.12)',
    labelColor: '#c8922a',
    textColor: '#3d2010',
    tailBg: '#faefd0',
    tailBorder: 'rgba(200,146,42,0.35)',
  },
  success: {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    border: 'rgba(34,197,94,0.3)',
    shadow: 'rgba(34,197,94,0.1)',
    labelColor: '#16a34a',
    textColor: '#14532d',
    tailBg: '#dcfce7',
    tailBorder: 'rgba(34,197,94,0.3)',
  },
  warning: {
    bg: 'linear-gradient(135deg, #fff7f5 0%, #ffe4de 100%)',
    border: 'rgba(185,28,28,0.25)',
    shadow: 'rgba(185,28,28,0.08)',
    labelColor: '#b91c1c',
    textColor: '#450a0a',
    tailBg: '#ffe4de',
    tailBorder: 'rgba(185,28,28,0.25)',
  },
} as const;

export function SpriteBubble({
  message,
  variant = 'info',
  className,
}: {
  message: string;
  variant?: 'info' | 'success' | 'warning';
  className?: string;
}) {
  const tSprite = useTranslations('sprite');
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-4 animate-in fade-in slide-in-from-bottom-3',
        className,
      )}
      style={{ animationDuration: '0.4s', animationFillMode: 'both' }}
    >
      {/* Sprite avatar — stylized guild familiar */}
      <div className="relative mt-1 shrink-0">
        <div
          className="flex size-11 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #f5d27d, #e8952a)',
            boxShadow: '0 3px 12px rgba(200,146,42,0.4), inset 0 1px 0 rgba(255,240,180,0.5)',
            border: '2px solid rgba(200,146,42,0.5)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Crystal ball */}
            <circle cx="11" cy="12" r="7" fill="rgba(42,18,6,0.15)" stroke="rgba(42,18,6,0.3)" strokeWidth="1"/>
            <ellipse cx="9" cy="10" rx="2" ry="1.5" fill="rgba(255,255,255,0.4)" transform="rotate(-20 9 10)"/>
            {/* Stars */}
            <path d="M11 2 L11.6 4 L13.5 4 L12 5.2 L12.6 7 L11 5.8 L9.4 7 L10 5.2 L8.5 4 L10.4 4 Z" fill="rgba(42,18,6,0.5)"/>
          </svg>
        </div>
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'transparent',
            boxShadow: '0 0 0 3px rgba(200,146,42,0.15)',
          }}
        />
      </div>

      {/* Speech bubble */}
      <div className="relative flex-1">
        {/* Tail pointing left */}
        <div
          className="absolute -left-2 top-4 size-4 rotate-45"
          style={{
            background: config.tailBg,
            borderLeft: `1px solid ${config.tailBorder}`,
            borderTop: `1px solid ${config.tailBorder}`,
          }}
        />

        <div
          className="relative rounded-lg px-4 py-3"
          style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            boxShadow: `0 4px 20px ${config.shadow}, 0 1px 4px rgba(0,0,0,0.04)`,
          }}
        >
          {/* Label */}
          <p
            className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.3em]"
            style={{ color: config.labelColor, fontFamily: 'var(--font-cinzel)' }}
          >
            {tSprite('title')}
          </p>

          {/* Message */}
          <p
            className="text-[0.95rem] leading-relaxed"
            style={{ color: config.textColor, fontFamily: 'var(--font-crimson)', fontStyle: 'italic' }}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
