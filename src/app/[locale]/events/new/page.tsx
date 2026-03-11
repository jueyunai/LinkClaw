import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createEvent } from '../actions';
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
import type { UserRole } from '@/types/database';

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/events/new`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const organizerProfile = profile as { role: UserRole } | null;

  if (!organizerProfile || organizerProfile.role !== 'organizer') {
    redirect(`/${locale}/?error=organizer_only`);
  }

  const { error } = await searchParams;

  return <NewEventForm error={error} />;
}

function NewEventForm({ error }: { error?: string }) {
  const t = useTranslations('events');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-10">
      <Card className="w-full border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t('create')}</CardTitle>
          <CardDescription>{t('targetAudiencePlaceholder')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <form action={createEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('eventTitle')}</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea id="description" name="description" className="min-h-36" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">{t('targetAudience')}</Label>
              <Textarea
                id="targetAudience"
                name="targetAudience"
                placeholder={t('targetAudiencePlaceholder')}
                className="min-h-28"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventDate">{t('eventDate')}</Label>
                <Input id="eventDate" name="eventDate" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('location')}</Label>
                <Input id="location" name="location" required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxGuests">{t('maxGuests')}</Label>
                <Input id="maxGuests" name="maxGuests" type="number" min={1} defaultValue={20} required />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" name="intent" value="draft" variant="outline" className="flex-1">
                {t('saveDraft')}
              </Button>
              <Button type="submit" name="intent" value="publish" className="flex-1">
                {t('publishNow')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
