import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Logian Survey',
  description: '分析に特化したアンケートツール',
  openGraph: {
    title: 'Logian Survey',
    description: '分析に特化したアンケートツール',
    url: process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app',
    siteName: 'LogianSurvey',
    images: [
      {
        url: '/images/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Logian Survey',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Logian Survey',
    description: '分析に特化したアンケートツール',
    images: ['/images/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  )
}