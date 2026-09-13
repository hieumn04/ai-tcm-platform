import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix } from './navigation';
import { NextResponse, NextRequest } from 'next/server';
// export default createMiddleware({
//   defaultLocale: 'en',
//   localePrefix,
//   locales,
// });

// export const config = {
//   matcher: ['/', '/(ja|en)/:path*'],
// };

//---------------------------------------
// Initialize the next-intl middleware.
const intlMiddleware = createMiddleware({
  defaultLocale: 'en',
  localePrefix,
  locales,
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for bare root or locale-only paths.
  if (pathname === '/' || locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`)) {
    // Use the locale from the path if available; otherwise default to 'en'
    const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || 'en';

    // Clone the current URL and update the pathname.
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${locale}/projects`;
    return NextResponse.redirect(newUrl);
  }

  // Otherwise, proceed with the next-intl middleware.
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/', '/(ja|en)/:path*'],
};
