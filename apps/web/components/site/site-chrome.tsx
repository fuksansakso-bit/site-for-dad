'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type ChromeSettings = {
  brandName: string;
  logoUrl: string | null;
  phone: string | null;
  region: string | null;
  leadTime: string | null;
  warranty: string | null;
  freeMeasurement: boolean;
  freeDelivery: boolean;
  freeInstallation: boolean;
  installment: string | null;
};

const desktopLinks = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/calculator', label: 'Рассчитать' },
  { href: '/portfolio', label: 'Наши работы' },
  { href: '/visualizer', label: 'Примерить' },
];

const mobileLinks = [
  { href: '/', icon: 'home', label: 'Главная' },
  { href: '/catalog', icon: 'grid', label: 'Каталог' },
  { href: '/calculator', icon: 'measure', label: 'Рассчитать' },
  { href: '/cart', icon: 'bag', label: 'Корзина' },
];

function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function Mark({ name }: { name: string }) {
  const common = {
    'aria-hidden': true,
    fill: 'none',
    height: 21,
    viewBox: '0 0 24 24',
    width: 21,
  } as const;
  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="m4 10 8-6 8 6v9H4z" stroke="currentColor" strokeLinejoin="round" />
        <path d="M9.5 19v-5h5v5" stroke="currentColor" />
      </svg>
    );
  }
  if (name === 'grid') {
    return (
      <svg {...common}>
        <rect height="6" rx="1" stroke="currentColor" width="6" x="4" y="4" />
        <rect height="6" rx="1" stroke="currentColor" width="6" x="14" y="4" />
        <rect height="6" rx="1" stroke="currentColor" width="6" x="4" y="14" />
        <rect height="6" rx="1" stroke="currentColor" width="6" x="14" y="14" />
      </svg>
    );
  }
  if (name === 'measure') {
    return (
      <svg {...common}>
        <path d="M5 19 19 5M8 5h11v11" stroke="currentColor" strokeLinecap="round" />
        <path d="m7 13 4 4m-1-7 4 4m-1-7 4 4" stroke="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 9h12l-1 11H7z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" />
    </svg>
  );
}

function Brand({ settings }: { settings: ChromeSettings }) {
  return (
    <Link className="brand" href="/" aria-label={`${settings.brandName} — на главную`}>
      {settings.logoUrl ? (
        <Image alt="" height={42} sizes="42px" src={settings.logoUrl} width={42} />
      ) : (
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
      <span className="brand-copy">
        <strong>{settings.brandName}</strong>
        {settings.region && <small>{settings.region}</small>}
      </span>
    </Link>
  );
}

export function SiteHeader({ settings }: { settings: ChromeSettings }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand settings={settings} />
        <nav className="desktop-nav" aria-label="Основная навигация">
          {desktopLinks.map((link) => (
            <Link
              aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {settings.phone && (
            <a className="header-phone" href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>
              {settings.phone}
            </a>
          )}
          <Link className="button button-compact" href="/cart">
            Корзина
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: ChromeSettings }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  const services = [
    settings.freeMeasurement && 'замер',
    settings.freeDelivery && 'доставка',
    settings.freeInstallation && 'установка',
  ].filter(Boolean);

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-grid">
          <div>
            <Brand settings={settings} />
            <p className="muted">Подбор, изготовление и установка солнцезащитных систем.</p>
          </div>
          <div>
            <p className="footer-heading">Покупателям</p>
            <Link href="/catalog">Каталог</Link>
            <Link href="/calculator">Расчёт стоимости</Link>
            <Link href="/portfolio">Наши работы</Link>
          </div>
          <div>
            <p className="footer-heading">Условия</p>
            {settings.leadTime && <span>{settings.leadTime}</span>}
            {settings.warranty && <span>{settings.warranty}</span>}
            {services.length > 0 && <span>{services.join(', ')} — бесплатно</span>}
            {settings.installment && <span>{settings.installment}</span>}
          </div>
          <div>
            <p className="footer-heading">Связаться</p>
            {settings.phone ? (
              <a href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>{settings.phone}</a>
            ) : (
              <span>Контакт будет указан после настройки</span>
            )}
            {settings.region && <span>{settings.region}</span>}
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>Предварительный расчёт не является публичной офертой.</span>
          <Link href="/admin/login">Вход для сотрудников</Link>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {mobileLinks.map((link) => (
          <Link
            aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
            href={link.href}
            key={link.href}
          >
            <Mark name={link.icon} />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export type { ChromeSettings };
