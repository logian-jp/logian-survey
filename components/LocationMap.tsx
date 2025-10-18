'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// LeafletのCSSを動的にインポート
const LeafletMap = dynamic(() => import('./LeafletMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <div className="text-gray-600">マップを読み込み中...</div>
      </div>
    </div>
  )
})

interface LocationData {
  id: string
  latitude: number
  longitude: number
  responseId: string
  createdAt: string
  answers: { [questionId: string]: string }
}

interface LocationMapProps {
  locations: LocationData[]
  onLocationClick?: (location: LocationData) => void
  className?: string
}

export default function LocationMap({ 
  locations, 
  onLocationClick, 
  className = "" 
}: LocationMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)

  if (locations.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">📍</div>
          <div className="text-gray-600">位置情報データがありません</div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-4 h-96">
        {/* マップ部分（左側2/3） */}
        <div className="flex-1">
          <LeafletMap 
            locations={locations}
            onLocationClick={onLocationClick}
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
            className="w-full h-full rounded-lg border border-gray-300"
          />
        </div>
        
        {/* 詳細パネル（右側1/3） */}
        <div className="w-1/3 bg-white border border-gray-300 rounded-lg p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📍 位置情報詳細
            </h3>
            <div className="text-sm text-gray-600">
              {locations.length}件の位置情報を表示中
            </div>
          </div>
          
          {selectedLocation ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 mb-2">選択中の回答</h4>
                <div className="text-sm text-blue-800">
                  <div><strong>回答ID:</strong> {selectedLocation.responseId}</div>
                  <div><strong>緯度:</strong> {selectedLocation.latitude.toFixed(6)}</div>
                  <div><strong>経度:</strong> {selectedLocation.longitude.toFixed(6)}</div>
                  <div><strong>回答日時:</strong> {formatDate(selectedLocation.createdAt)}</div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 mb-2">回答内容</h4>
                <div className="space-y-2">
                  {Object.entries(selectedLocation.answers).map(([question, answer]) => (
                    <div key={question} className="text-sm">
                      <div className="font-medium text-gray-700">{question}</div>
                      <div className="text-gray-600 ml-2">{String(answer)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">📍</div>
              <div>マップ上のピンをクリックして詳細を確認</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
