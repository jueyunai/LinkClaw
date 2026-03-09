import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
    </main>
  );
}
