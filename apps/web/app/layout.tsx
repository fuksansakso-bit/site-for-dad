import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { connection } from 'next/server';

import { SiteFooter, SiteHeader } from '../components/site/site-chrome';
import type { ChromeSettings } from '../components/site/site-chrome';
import { isAiVisualizerAvailable } from '../lib/ai-visualization/public-availability';
import { getSiteSettings, publicImageUrl } from '../lib/phase2a/data';
import { resolvePublicSiteName } from '../lib/presentation';
import './tokens.css';
import './styles.css';

const manrope = Manrope({
  display: 'swap',
  subsets: ['cyrillic', 'latin'],
  variable: '--font-manrope',
});

const cormorant = Cormorant_Garamond({
  display: 'swap',
  subsets: ['cyrillic', 'latin'],
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  description: 'Каталог жалюзи, предварительный расчёт стоимости и заявка на бесплатный замер.',
  title: {
    default: 'Жалюзи на заказ — каталог и расчёт',
    template: '%s — жалюзи на заказ',
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const [settings, aiEnabled] = await Promise.all([getSiteSettings(), isAiVisualizerAvailable()]);
  const chromeSettings: ChromeSettings = {
    aiEnabled,
    brandName: resolvePublicSiteName(settings?.site_name),
    freeDelivery: settings?.free_delivery ?? false,
    freeInstallation: settings?.free_installation ?? false,
    freeMeasurement: settings?.free_measurement ?? false,
    installment: settings?.installment_text?.trim() || null,
    leadTime: settings?.lead_time_text?.trim() || null,
    logoUrl: settings?.logo_path ? publicImageUrl('branding', settings.logo_path) : null,
    phone: settings?.phone?.trim() || null,
    region: settings?.region?.trim() || null,
    warranty: settings?.warranty_text?.trim() || null,
    whatsappPhone: settings?.whatsapp_phone?.trim() || null,
  };

  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${cormorant.variable}`}>
        <a className="skip-link" href="#main-content">
          Перейти к содержанию
        </a>
        <SiteHeader settings={chromeSettings} />
        <main className="page-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter settings={chromeSettings} />
      </body>
    </html>
  );
}
