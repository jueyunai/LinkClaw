'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const nextLocale = locale === 'zh' ? 'en' : 'zh';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      onClick={switchLocale}
      className="rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all hover:bg-white/10 active:scale-95"
      style={{
        color: '#c8922a',
        border: '1px solid rgba(200,146,42,0.35)',
        fontFamily: 'var(--font-cinzel)',
        background: 'rgba(200,146,42,0.08)',
      }}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
