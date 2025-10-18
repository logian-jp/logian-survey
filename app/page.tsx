import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f2f2f2' }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#f2f2f2,rgba(242,242,242,0.6))]"></div>
        <div className="relative">
          <div className="container mx-auto px-4 py-24 lg:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8" style={{ backgroundColor: '#2f2f2f' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6" style={{ color: '#2f2f2f' }}>
                分析に特化した
                <span className="block mt-2" style={{ color: '#2f2f2f' }}>アンケートツール</span>
              </h1>
              <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#666666' }}>
                Googleフォームのような使いやすさで、データ分析に最適化された結果を出力。
                日本の市場調査に特化した機能を提供します。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {session ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center px-8 py-4 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                      style={{ backgroundColor: '#2f2f2f' }}
                    >
                      ダッシュボード
                    </Link>
                    <Link
                      href="/surveys"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white font-semibold rounded-xl border transition-colors shadow-sm hover:shadow-md"
                      style={{ color: '#2f2f2f', borderColor: '#2f2f2f' }}
                    >
                      アンケート一覧
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      className="inline-flex items-center justify-center px-8 py-4 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                      style={{ backgroundColor: '#2f2f2f' }}
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white font-semibold rounded-xl border transition-colors shadow-sm hover:shadow-md"
                      style={{ color: '#2f2f2f', borderColor: '#2f2f2f' }}
                    >
                      新規登録
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#2f2f2f' }}>
              なぜLogian Surveyなのか
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#666666' }}>
              従来のアンケートツールでは実現できない、分析に特化した機能を提供します
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="group">
              <div className="rounded-2xl p-8 h-full transition-all duration-300 group-hover:shadow-lg" style={{ backgroundColor: '#f2f2f2' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors" style={{ backgroundColor: '#2f2f2f' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4" style={{ color: '#2f2f2f' }}>分析に最適化</h3>
                <p className="leading-relaxed" style={{ color: '#666666' }}>
                  カテゴリ変数の順序構造判定や、NAの取り扱いなど、データ分析に必要な設定を簡単に行えます。統計分析に必要な前処理を自動化します。
                </p>
              </div>
            </div>

            <div className="group">
              <div className="rounded-2xl p-8 h-full transition-all duration-300 group-hover:shadow-lg" style={{ backgroundColor: '#f2f2f2' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors" style={{ backgroundColor: '#2f2f2f' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4" style={{ color: '#2f2f2f' }}>日本市場特化</h3>
                <p className="leading-relaxed" style={{ color: '#666666' }}>
                  都道府県、年代など、日本の市場調査でよく使われる質問パーツを事前に用意。日本のビジネス慣習に合わせた調査設計が可能です。
                </p>
              </div>
            </div>

            <div className="group">
              <div className="rounded-2xl p-8 h-full transition-all duration-300 group-hover:shadow-lg" style={{ backgroundColor: '#f2f2f2' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors" style={{ backgroundColor: '#2f2f2f' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4" style={{ color: '#2f2f2f' }}>柔軟な出力</h3>
                <p className="leading-relaxed" style={{ color: '#666666' }}>
                  通常のCSV、正規化・標準化されたCSVなど、用途に応じたデータ出力が可能。統計ソフトウェアでの分析を効率化します。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" style={{ backgroundColor: '#2f2f2f' }}>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              今すぐ始めましょう
            </h2>
            <p className="text-xl mb-10" style={{ color: '#cccccc' }}>
              無料でアカウントを作成して、分析に特化したアンケートツールをお試しください
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
                  >
                    ダッシュボードへ
                  </Link>
                  <Link
                    href="/surveys"
                    className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-xl border border-white hover:bg-white hover:text-black transition-colors"
                  >
                    アンケート一覧
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
                  >
                    無料で始める
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-xl border border-white hover:bg-white hover:text-black transition-colors"
                  >
                    ログイン
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#f2f2f2', borderTop: '1px solid #e0e0e0' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: '#2f2f2f' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold" style={{ color: '#2f2f2f' }}>Logian Survey</span>
              </div>
              <p className="mb-6 max-w-md" style={{ color: '#666666' }}>
                分析に特化したアンケートツール。データ分析に最適化された結果を出力し、日本の市場調査を支援します。
              </p>
              <div className="flex space-x-4">
                <a href="#" className="transition-colors" style={{ color: '#999999' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="transition-colors" style={{ color: '#999999' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#2f2f2f' }}>サービス</h3>
              <ul className="space-y-3">
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>機能一覧</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>料金プラン</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>API仕様</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>サポート</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#2f2f2f' }}>会社情報</h3>
              <ul className="space-y-3">
                <li><a href="https://logian.jp" target="_blank" rel="noopener noreferrer" className="transition-colors" style={{ color: '#666666' }}>Logian株式会社</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>プライバシーポリシー</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>利用規約</a></li>
                <li><a href="#" className="transition-colors" style={{ color: '#666666' }}>お問い合わせ</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8" style={{ borderTop: '1px solid #e0e0e0' }}>
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm" style={{ color: '#999999' }}>
                © 2024 Logian株式会社. All rights reserved.
              </p>
              <p className="text-sm mt-4 md:mt-0" style={{ color: '#999999' }}>
                データ分析・AI技術の専門企業
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
