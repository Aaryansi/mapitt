import type { Metadata } from 'next';
import '@/styles/globals.css';
import { TrpcProvider } from '@/components/providers/TrpcProvider';

export const metadata: Metadata = {
  title: 'MapIt',
  description: 'Transform routes into animated videos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TrpcProvider>
          {children}
        </TrpcProvider>
      </body>
    </html>
  );
}