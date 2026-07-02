import type { Metadata } from 'next';
import './globals.scss';
import { getServerSession } from 'next-auth';
import Providers from './providers';
import { authOptions } from '@/lib/auth-options';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'STR Fleet Manager',
  description: 'STR multi-product OTA fleet management',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang='en'>
      <body>
        <Providers session={session}>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
