import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { RankBadge } from '@/components/features/rank-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import type { HunterLevel } from '@/types/database';
import { BackButton } from '@/components/ui/back-button';
import { updateHunterLevel } from '../actions';

type HunterProfile = {
  id: string;
  display_name: string;
  industry: string | null;
  city: string | null;
  hunter_level: HunterLevel;
  created_at: string;
};

export default async function AdminHuntersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/admin/hunters`);
  }

  if (!isAdmin(user.email)) {
    redirect(`/${locale}`);
  }

  const { data: hunters } = await supabase
    .from('profiles')
    .select('id, display_name, industry, city, hunter_level, created_at')
    .eq('role', 'guest')
    .order('created_at', { ascending: false });

  const { error, success } = await searchParams;

  return (
    <HuntersContent
      hunters={(hunters ?? []) as HunterProfile[]}
      error={error}
      success={success}
    />
  );
}

function HuntersContent({
  hunters,
  error,
  success,
}: {
  hunters: HunterProfile[];
  error?: string;
  success?: string;
}) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tHunter = useTranslations('hunter');
  const locale = useLocale();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="space-y-6">
          <div className="space-y-2">
            <BackButton />
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">{tAdmin('label')}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{tAdmin('huntersTitle')}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{tAdmin('huntersDescription')}</p>
          </div>

          {error ? (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          ) : null}

          {success === 'updated' ? (
            <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">{tAdmin('levelUpdated')}</div>
          ) : null}

          {hunters.length > 0 ? (
            <div className="grid gap-4">
              {hunters.map((hunter) => {
                const joinedAt = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(hunter.created_at));

                return (
                  <Card key={hunter.id} className="border-border/60 bg-card/85 shadow-sm">
                    <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <CardTitle className="text-xl">{hunter.display_name}</CardTitle>
                          <RankBadge level={hunter.hunter_level} />
                        </div>
                        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span>{hunter.industry || tCommon('loading')}</span>
                          <span>{hunter.city || '—'}</span>
                          <span>{tAdmin('joinedAt', { date: joinedAt })}</span>
                        </CardDescription>
                      </div>
                      <form action={updateHunterLevel} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="targetUserId" value={hunter.id} />
                        <label className="text-sm font-medium text-foreground/80" htmlFor={`level-${hunter.id}`}>
                          {tAdmin('changeLevel')}
                        </label>
                        <select
                          id={`level-${hunter.id}`}
                          name="newLevel"
                          defaultValue={String(hunter.hunter_level)}
                          className="h-9 rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none focus:border-primary"
                        >
                          {([1, 2, 3, 4, 5, 6] as HunterLevel[]).map((level) => (
                            <option key={level} value={level}>
                              {tHunter(`level_${['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend'][level - 1]}`)}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" type="submit">{tAdmin('saveLevel')}</Button>
                      </form>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-border/70 bg-muted/30">
              <CardContent className="px-6 py-12 text-sm text-muted-foreground">
                {tAdmin('noHunters')}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
