import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const variantClassMap = {
  info: 'border-amber-200/80 bg-amber-50/85 text-amber-950',
  success: 'border-emerald-200/80 bg-emerald-50/85 text-emerald-950',
  warning: 'border-rose-200/80 bg-rose-50/90 text-rose-950',
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

  return (
    <div className={cn('flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2', className)}>
      <Avatar className="mt-1 ring-2 ring-amber-300/50" size="lg">
        <AvatarFallback className="bg-[linear-gradient(135deg,#f5d27d,#f08a5d)] text-amber-950">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'relative flex-1 rounded-[1.35rem] border px-4 py-3 shadow-[0_14px_34px_rgba(120,72,24,0.10)]',
          'before:absolute before:-left-2 before:top-4 before:size-4 before:rotate-45 before:border-l before:border-t before:bg-inherit before:content-[""]',
          variantClassMap[variant],
        )}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] opacity-70">
          {tSprite('title')}
        </p>
        <p className="mt-1 text-sm leading-6">{message}</p>
      </div>
    </div>
  );
}
