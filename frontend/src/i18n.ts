import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { LocaleCodeType } from '@/types/locale';

const locales: LocaleCodeType[] = ['en', 'ja'];

export default getRequestConfig(async ({ locale }) => {
  if (!locale || !locales.includes(locale as LocaleCodeType)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
