import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: Promise<{ shareUrl: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { shareUrl } = await params
    // アンケート情報を取得 (Supabase SDK使用)
    const { data: survey, error } = await supabase
      .from('Survey')
      .select('*, user:User(customLogoUrl)')
      .eq('shareUrl', shareUrl)
      .eq('status', 'ACTIVE')
      .single()

    if (error) {
      console.error('Survey not found:', error)
    }

    if (!survey) {
      return {
        title: 'Survey Not Found',
        description: 'The requested survey could not be found.',
      }
    }

    const title = (survey as any).useCustomLogo ? survey.title : `${survey.title} - LogianSurvey`
    const description = survey.description 
      ? survey.description.replace(/<[^>]*>/g, '').substring(0, 160)
      : survey.title

    // 画像URLを決定
    let imageUrl = (survey as any).ogImageUrl || survey.user.customLogoUrl || '/images/logo.svg'
    
    // Base64データの場合は画像APIエンドポイントを使用
    if (imageUrl.startsWith('data:')) {
      imageUrl = `${process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app'}/api/image/${survey.id}?type=og`
    }
    // 相対URLの場合は絶対URLに変換
    else if (!imageUrl.startsWith('http')) {
      imageUrl = `${process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app'}${imageUrl}`
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app'}/survey/${shareUrl}`,
        siteName: 'LogianSurvey',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: 'ja_JP',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Survey - LogianSurvey',
      description: 'Logian Survey Platform',
    }
  }
}

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
