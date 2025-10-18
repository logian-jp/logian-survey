import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/logo.svg"
              alt="Logian Survey"
              width={300}
              height={80}
              className="h-20 w-auto"
            />
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            分析に特化したアンケートツール。Googleフォームのような使いやすさで、
            データ分析に最適化された結果を出力します。
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/signin"
              className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/auth/signup"
              className="inline-block bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
            >
              新規登録
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">分析に最適化</h3>
            <p className="text-gray-600">
              カテゴリ変数の順序構造判定や、NAの取り扱いなど、
              データ分析に必要な設定を簡単に行えます。
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">日本市場特化</h3>
            <p className="text-gray-600">
              都道府県、年代など、日本の市場調査でよく使われる
              質問パーツを事前に用意しています。
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">柔軟な出力</h3>
            <p className="text-gray-600">
              通常のCSV、正規化・標準化されたCSVなど、
              用途に応じたデータ出力が可能です。
            </p>
          </div>
        </div>

        {/* 運営会社情報 */}
        <div className="mt-20 pt-8 border-t border-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">運営会社</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Logian株式会社</h3>
                  <p className="text-sm text-gray-600">データ分析・AI技術の専門企業</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">ウェブサイト:</span>{' '}
                  <a 
                    href="https://logian.jp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    https://logian.jp
                  </a>
                </p>
                <p>
                  <span className="font-medium">事業内容:</span> データ分析、AI技術開発、コンサルティング
                </p>
                <p>
                  <span className="font-medium">サービス:</span> 分析に特化したアンケートツールの提供
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
