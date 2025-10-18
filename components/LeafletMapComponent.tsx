'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationData {
  id: string
  latitude: number
  longitude: number
  responseId: string
  createdAt: string
  answers: { [questionId: string]: string }
}

interface LeafletMapComponentProps {
  locations: LocationData[]
  onLocationClick?: (location: LocationData) => void
  className?: string
  selectedLocation?: LocationData | null
  onLocationSelect?: (location: LocationData | null) => void
}

// 型定義をエクスポート
export type { LocationData, LeafletMapComponentProps }

export default function LeafletMapComponent({ 
  locations, 
  onLocationClick, 
  className = "",
  selectedLocation,
  onLocationSelect
}: LeafletMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return

    // 既存のマップをクリア
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }

    // 位置情報の中心点を計算
    const center = calculateCenter(locations)
    
    // マップを初期化
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    })

    // OpenStreetMapタイルレイヤーを追加（無料）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map)

    // マーカーを作成
    createMarkers(map, locations)

    mapInstanceRef.current = map

    // クリーンアップ関数
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []
        mapInstanceRef.current = null
      }
    }
  }, [locations])

  const calculateCenter = (locations: LocationData[]) => {
    if (locations.length === 0) {
      return { lat: 35.6762, lng: 139.6503 } // 東京のデフォルト座標
    }

    if (locations.length === 1) {
      return { lat: locations[0].latitude, lng: locations[0].longitude }
    }

    // 複数の位置情報の中心点を計算
    const sum = locations.reduce(
      (acc, location) => ({
        lat: acc.lat + location.latitude,
        lng: acc.lng + location.longitude
      }),
      { lat: 0, lng: 0 }
    )

    return {
      lat: sum.lat / locations.length,
      lng: sum.lng / locations.length
    }
  }

  const createMarkers = (map: L.Map, locations: LocationData[]) => {
    // カスタムアイコンを作成
    const customIcon = L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: #3B82F6;
          border: 2px solid #1E40AF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          📍
        </div>
      `,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    })

    locations.forEach((location, index) => {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: customIcon
      }).addTo(map)

      // ポップアップを作成
      const popupContent = createPopupContent(location, index + 1)
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
      })

      // クリックイベント
      marker.on('click', () => {
        if (onLocationSelect) {
          onLocationSelect(location)
        }
        if (onLocationClick) {
          onLocationClick(location)
        }
      })

      markersRef.current.push(marker)
    })
  }

  const createPopupContent = (location: LocationData, index: number) => {
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

    return `
      <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="font-weight: bold; color: #1F2937; margin-bottom: 8px; font-size: 14px;">
          📍 回答ID: ${location.responseId.substring(0, 8)}...
        </div>
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">
          <div>緯度: ${location.latitude.toFixed(6)}</div>
          <div>経度: ${location.longitude.toFixed(6)}</div>
          <div>回答日時: ${formatDate(location.createdAt)}</div>
        </div>
        <div style="font-size: 11px; color: #3B82F6; margin-top: 8px;">
          詳細を確認
        </div>
      </div>
    `
  }

  return (
    <div 
      ref={mapRef} 
      className={className}
      style={{ minHeight: '384px' }}
    />
  )
}
