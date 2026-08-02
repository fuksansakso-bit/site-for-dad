import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './styles.css';

export const metadata: Metadata = {
  description: 'Техническая оболочка Phase 1A Foundation.',
  robots: { follow: false, index: false },
  title: 'PROJECT_NAME · Foundation',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
