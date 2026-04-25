import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'FridgeAI — What can I cook tonight?',
  description: 'Drop a photo of your fridge. AI detects your ingredients and crafts 3 recipes you can make right now.',
  manifest: '/manifest.json',
  themeColor: '#00D4AA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FridgeAI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body
        style={{
          fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
          backgroundColor: '#050E0C',
          color: '#ffffff',
          margin: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
