import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { IntlProvider } from '@/providers/IntlProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synap6ia Marketing',
  description: 'AI Marketing Autopilot Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <IntlProvider>
            <AuthProvider>{children}</AuthProvider>
          </IntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
