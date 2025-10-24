'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Header() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.svg"
              alt="Logian Survey"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* ナビゲーション */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              href="/surveys"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              アンケート一覧
            </Link>
              <Link
                href="/surveys/create"
                className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                アンケート作成
              </Link>
            {session?.user?.email && ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com'].includes(session.user.email) && (
              <Link
                href="/admin"
                className="text-red-700 hover:text-red-900 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-red-300 rounded-md"
              >
                管理画面
              </Link>
            )}
          </nav>

          {/* モバイルメニューボタン */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900 p-2"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <button
                    type="button"
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
                  >
                    <span className="sr-only">ユーザーメニューを開く</span>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500">
                      <span className="text-sm font-medium leading-none text-white">
                        {session.user?.name?.[0] || session.user?.email?.[0]}
                      </span>
                    </span>
                    <span className="ml-2 hidden lg:block">{session.user?.name || session.user?.email}</span>
                    <svg
                      className="ml-2 h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {/* Dropdown content - ホバーで表示 */}
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        設定
                      </Link>
                      <Link
                        href="/tickets"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        チケット
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        ログアウト
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/signin"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  新規登録
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/dashboard"
                className="block text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ダッシュボード
              </Link>
              <Link
                href="/surveys"
                className="block text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                アンケート一覧
              </Link>
              <Link
                href="/surveys/create"
                className="block bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                アンケート作成
              </Link>
              {session?.user?.email && ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com'].includes(session.user.email) && (
                <Link
                  href="/admin"
                  className="block text-red-700 hover:text-red-900 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-red-300 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  管理画面
                </Link>
              )}
              {session && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">
                    ログイン中: {session.user?.name || session.user?.email}
                  </div>
                  <button
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-left text-red-600 hover:text-red-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
