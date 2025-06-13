import type { Metadata } from 'next';
import '../styles/globals.css';  // <-- adjust path if you keep your globals.css elsewhere
// import { TrpcProvider } from '@/components/providers/TrpcProvider';

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
      <head>
        <link 
          href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}