import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import AppGuard from '@/components/AppGuard'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AJIMINO SDN. BHD. — HR Portal',
  description: 'Human Resource Management Portal for AJIMINO SDN. BHD.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AJIMINO HR',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-48x48.png',   sizes: '48x48',   type: 'image/png' },
      { url: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
      { url: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#0A1128',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Inline bfcache guard — runs before React, catches very old page snapshots */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('pageshow',function(e){if(e.persisted)window.location.reload();});` }} />
        {/* PWA — iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <AppGuard />
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  )
}
