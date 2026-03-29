import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '家計フロー・ナビ',
  description: 'レシート撮影で自動記録する家計管理アプリ',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#050816',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
