import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'YieldRails - Yield-Generating Payment Platform',
  description: 'A modern payment platform with yield generation, cross-chain capabilities, and enterprise-grade security. Earn up to 8.1% APY on escrowed payments.',
  keywords: 'payments, yield, DeFi, cross-chain, escrow, fintech',
  authors: [{ name: 'YieldRails Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#6366f1',
  openGraph: {
    title: 'YieldRails - Yield-Generating Payment Platform',
    description: 'Earn yield on your payments while they\'re in escrow. Secure, compliant, and built for modern businesses.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YieldRails - Yield-Generating Payment Platform',
    description: 'Earn yield on your payments while they\'re in escrow.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}