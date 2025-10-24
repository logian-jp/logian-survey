'use client'

import { useState, useEffect, useRef } from 'react'

interface StableYouTubeEmbedProps {
  videoId: string
  title?: string
  width?: number
  height?: number
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
}

export default function StableYouTubeEmbed({
  videoId,
  title = '',
  width = 560,
  height = 315,
  autoplay = false,
  muted = false,
  controls = true,
  className = ''
}: StableYouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // YouTubeのサムネイルURLを生成（高解像度）
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    setThumbnailUrl(thumbnail)
  }, [videoId])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleThumbnailClick = () => {
    setIsLoaded(true)
  }

  // YouTube埋め込みURLを生成
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${controls ? 1 : 0}&rel=0&modestbranding=1`

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {!isLoaded ? (
        <div 
          className="relative w-full h-full cursor-pointer group"
          onClick={handleThumbnailClick}
        >
          {/* サムネイル画像 */}
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              // 高解像度サムネイルが取得できない場合は標準解像度を使用
              const target = e.target as HTMLImageElement
              target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            }}
          />
          
          {/* 再生ボタンオーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-75 rounded-full p-4 group-hover:bg-opacity-90 transition-all duration-200">
              <svg 
                className="w-12 h-12 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          
          {/* タイトル表示 */}
          {title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <p className="text-white text-sm font-medium line-clamp-2">
                {title}
              </p>
            </div>
          )}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title}
          width={width}
          height={height}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg"
          onLoad={handleLoad}
        />
      )}
    </div>
  )
}
