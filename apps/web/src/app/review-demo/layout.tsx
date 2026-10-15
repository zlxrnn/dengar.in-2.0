import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Demo reviewer (sintetis)',
  description: 'Ilustrasi sintetis untuk reviewer. Tidak menerima data nyata dan tidak terhubung ke sistem klinis.',
  robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

