import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function LocaleNotFound({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEnglish = locale === 'en';

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-10">
      <Card className="w-full max-w-xl border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto rounded-full border border-border/70 bg-muted/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary/80">
            404 · LinkClaw
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight md:text-4xl">
              {isEnglish ? 'Page not found' : '页面不存在'}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground md:text-base">
              {isEnglish
                ? 'The page you are looking for may have moved or does not exist yet.'
                : '你访问的页面可能已被移动，或当前还不存在。'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button>{isEnglish ? 'Back home' : '返回首页'}</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
