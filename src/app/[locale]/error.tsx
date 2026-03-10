'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === 'en' ? 'en' : 'zh';

  const copy = useMemo(
    () =>
      locale === 'en'
        ? {
            badge: 'System Notice',
            title: 'Something went wrong',
            description:
              'The page ran into an unexpected problem. You can retry now or go back to the home page.',
            retry: 'Try again',
            home: 'Back home',
            detail: 'Error detail',
          }
        : {
            badge: '系统提示',
            title: '页面出现异常',
            description: '当前页面遇到了一个意外问题。你可以立即重试，或先返回首页继续浏览。',
            retry: '重新尝试',
            home: '返回首页',
            detail: '错误详情',
          },
    [locale],
  );

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 px-4 py-10">
      <Card className="w-full max-w-xl border-border/60 bg-card/85 shadow-xl backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto rounded-full border border-border/70 bg-muted/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary/80">
            {copy.badge}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight md:text-4xl">{copy.title}</CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground md:text-base">
              {copy.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {error.message ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <p className="mb-1 font-medium">{copy.detail}</p>
              <p className="break-words leading-6">{error.message}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>{copy.retry}</Button>
            <Link href="/">
              <Button variant="outline">{copy.home}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
