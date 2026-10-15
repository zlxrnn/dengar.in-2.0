import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pilihan bantuan terverifikasi',
  description: 'Pilihan bantuan dengan sumber, tanggal verifikasi, dan batas informasi. Bukan jaminan ketersediaan layanan.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

