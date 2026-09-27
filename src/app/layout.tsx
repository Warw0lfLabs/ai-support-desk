import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/shell';
export const metadata: Metadata = {
  title: { default: 'AI Support Desk', template: '%s · AI Support Desk' },
  description:
    'A thoughtful support workspace with AI-assisted ticket triage. Synthetic demo data only.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
