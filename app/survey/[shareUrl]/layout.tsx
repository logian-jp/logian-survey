import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface Props {
  params: { shareUrl: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const survey = await prisma.survey.findUnique({
      where: {
        shareUrl: params.shareUrl,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            customLogoUrl: true
          }
        }
      },
    })

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
    
    // 相対URLの場合は絶対URLに変換
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app'}${imageUrl}`
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${process.env.NEXTAUTH_URL || 'https://logian-survey.vercel.app'}/survey/${params.shareUrl}`,
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
