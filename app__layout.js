import './globals.css';
import { Big_Shoulders_Display, DM_Sans } from 'next/font/google';
import { BRAND, TAGLINE } from '../lib/config';
import { Shell, ToastProvider } from '../components/ui';

const display = Big_Shoulders_Display({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-display' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata = { title: `${BRAND}: Gym and Classes`, description: TAGLINE };
export const viewport = { themeColor: '#0A0C0F' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ToastProvider><Shell>{children}</Shell></ToastProvider>
      </body>
    </html>
  );
}
