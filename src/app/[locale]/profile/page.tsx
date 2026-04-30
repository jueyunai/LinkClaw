import { useTranslations } from 'next-intl';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/server';
import { BackButton } from '@/components/ui/back-button';
import { updateProfile } from './actions';

interface ProfileFormValues {
  display_name: string | null;
  bio: string | null;
  industry: string | null;
  city: string | null;
  role?: 'guest' | 'organizer';
  hunter_level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; success?: string; from?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, industry, city, role, hunter_level')
    .eq('id', user.id)
    .single();
  const profileValues = profile as ProfileFormValues | null;

  const { error, success, from } = await searchParams;
  // Normalize from parameter: only accept 'home' | 'center'
  const normalizedFrom = from === 'home' ? 'home' : 'center';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackButton />
      <ProfileForm
        profile={profileValues}
        error={error}
        success={success === 'true'}
        from={normalizedFrom}
      />
    </div>
  );
}

export function ProfileForm({
  profile,
  error,
  success,
  from = 'center',
}: {
  profile: ProfileFormValues | null;
  error?: string;
  success?: boolean;
  from?: 'home' | 'center';
}) {
  const t = useTranslations('profile');
  const tHunter = useTranslations('hunter');
  const tc = useTranslations('common');

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-4">
        {profile?.role === 'guest' && profile.hunter_level ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,243,205,0.95),rgba(255,232,183,0.75))] px-4 py-3">
            <RankBadge level={profile.hunter_level} size="lg" />
            <div>
              <CardTitle className="text-xl">{tHunter(`level_${['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend'][profile.hunter_level - 1]}`)}</CardTitle>
              <CardDescription>{t('hunterBanner')}</CardDescription>
            </div>
          </div>
        ) : null}
        <div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('bioPlaceholder')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            {t('saveSuccess')}
          </div>
        ) : null}
        <form action={updateProfile} className="space-y-4">
          <input type="hidden" name="from" value={from} />
          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile?.display_name ?? ''}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t('bio')}</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile?.bio ?? ''}
              placeholder={t('bioPlaceholder')}
              className="min-h-36"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">{t('industry')}</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={profile?.industry ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t('city')}</Label>
              <Input
                id="city"
                name="city"
                defaultValue={profile?.city ?? ''}
              />
            </div>
          </div>
          <Button type="submit">{tc('save')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
