import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Transaction Tracker',
  description: 'AI-powered transaction categorization from credit card emails',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
