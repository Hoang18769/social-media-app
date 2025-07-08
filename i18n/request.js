// i18n/request.js
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales } from './index';

export default getRequestConfig(async ({ locale }) => {
  console.log('Request config - Received locale:', locale);
  console.log('Request config - Available locales:', locales);
  
  // Validate locale
  if (!locales.includes(locale)) {
    console.log('Request config - Invalid locale, calling notFound()');
    notFound();
  }

  try {
    // Load messages dynamically
    const messages = (await import(`../messages/${locale}.json`)).default;
    console.log('Request config - Messages loaded for locale:', locale);
    
    return {
      messages,
      timeZone: 'Asia/Ho_Chi_Minh',
      now: new Date(),
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          },
        },
      },
    };
  } catch (error) {
    console.error(`Request config - Failed to load messages for locale "${locale}":`, error);
    notFound();
  }
});