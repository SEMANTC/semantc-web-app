// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Space_Grotesk, Manrope } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { TailwindIndicator } from '@/components/tailwind-indicator';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/context/auth';
import ConnectorCheck from '@/components/connector-check';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk'
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata = {
  metadataBase: new URL('https://semantc.com'),
  title: {
    default: 'SEMANTC AI - Analytics',
    template: `%s - Next.js AI Chatbot`
  },
  description: 'An AI chatbot built with Next.js and Cloud Run',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(spaceGrotesk.variable, manrope.variable)}>
      <body
        className={cn(
          'font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <Toaster position="top-center" />
        <AuthProvider>
          <Providers
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConnectorCheck>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex flex-col flex-1">{children}</main>
              </div>
            </ConnectorCheck>
            <TailwindIndicator />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}