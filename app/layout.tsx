import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Finder Agent',
  description: 'Automated freelance job search for technical writers — Upwork and LinkedIn, scored with Claude AI, saved to Notion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
