import './globals.css';
import { Barlow_Condensed, Barlow } from 'next/font/google';
import { BRAND } from '../lib/config';

const display = Barlow_Condensed({ subsets: ['latin'], weight: ['800'], variable: '--font-display' });
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

export const metadata = { title: BRAND, description: 'Gym membership and classes' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
