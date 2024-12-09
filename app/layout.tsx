import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { Viewport } from 'next'
import { AuthProvider } from '@/lib/context/auth-context'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Skate Spot Finder',
  description: 'Discover and share skate spots globally',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Skate Spot Finder',
    startupImage: [
      '/icons/icon-512x512.png',
    ],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: [
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Skate Spot Finder',
    'apple-mobile-web-app-title': 'Skate Spot Finder',
    'theme-color': '#000000',
    'msapplication-navbutton-color': '#000000',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-starturl': '/',
    'preload-strategy': 'preload'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192x192.svg" />
        <link rel="alternate icon" type="image/png" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="mask-icon" href="/icons/icon-192x192.svg" color="#000000" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
