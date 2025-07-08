// components/IntlProviderLoader.jsx
import { getLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n'; // 👈 đi lên 2 cấp
// Note: Ensure that the locales array is exported from '@/i18n/locales' as
import IntlProviderWrapper from './IntlProviderWrapper'; // client

export default async function IntlProviderLoader({ children }) {
  const locale = await getLocale();
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <IntlProviderWrapper locale={locale} messages={messages}>
      {children}
    </IntlProviderWrapper>
  );
}
