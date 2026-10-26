import type { Metadata } from 'next';
import './globals.css';
import { getCurrentAuth } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'BongzMoto | Workshop Management for Township Mechanics',
  description:
    'Mobile-first vehicle repair job management, WhatsApp sharing, quotations, evidence capture and payments for South African auto workshops.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getCurrentAuth();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-zinc-100 text-zinc-900 antialiased font-sans pb-20 sm:pb-0">
        <Header
          currentUser={{
            id: auth.user.id,
            name: auth.user.full_name,
            role: auth.user.role,
          }}
          workshopName={auth.workshop.name}
          workshopLogo={auth.workshop.logo_url}
        />
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
