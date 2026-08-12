'use client';

import dynamic from 'next/dynamic';

const StarfieldIntro = dynamic(
  () => import('./starfield-intro').then((module) => module.StarfieldIntro),
  { ssr: false },
);

export function IntroLoader() {
  return <StarfieldIntro />;
}
