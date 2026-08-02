import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import './styles.css';

export const metadata: Metadata = {
  description: 'Техническая оболочка Phase 1A Foundation.',
  robots: { follow: false, index: false },
  title: 'PROJECT_NAME · Foundation',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<React.JSX.Element> {
  await connection();
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
