import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdmin } from './lib/admin';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);
const protectedPaths = ['/profile', '/events/new', '/my-events', '/admin'];
const authPaths = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { user } = await updateSession(request, intlResponse);

  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = pathname.replace(/^\/(zh|en)/, '') || '/';

  if (
    protectedPaths.some((path) => pathnameWithoutLocale.startsWith(path)) &&
    !user
  ) {
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathnameWithoutLocale.startsWith('/admin') && user && !isAdmin(user.email)) {
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (authPaths.some((path) => pathnameWithoutLocale.startsWith(path)) && user) {
    const locale = pathname.startsWith('/en') ? 'en' : 'zh';
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
