import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const originLat = searchParams.get('originLat')
    const originLng = searchParams.get('originLng')
    const destLat = searchParams.get('destLat')
    const destLng = searchParams.get('destLng')
    const mode = searchParams.get('mode') || 'walking' // walking, driving, transit

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: '出発地と目的地の座標が必要です' },
        { status: 400 }
      )
    }

    const key = process.env.GOOGLE_MAPS_API_KEY
    if (!key) {
      return NextResponse.json(
        { error: 'Google Maps API キーが設定されていません' },
        { status: 500 }
      )
    }

    // Google Directions APIを使用
    const origin = `${parseFloat(originLat)},${parseFloat(originLng)}`
    const destination = `${parseFloat(destLat)},${parseFloat(destLng)}`

    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      language: 'ja',
      key
    })

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`

    const response = await fetch(url, { cache: 'no-store' })
    const data = await response.json()

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const leg = route.legs[0]

      // ポリライン用の座標配列を生成
      const polyline = route.overview_polyline.points
      const steps: Array<{ lat: number; lng: number }> = []

      // 各ステップから座標を抽出
      leg.steps.forEach((step: any) => {
        if (step.start_location) {
          steps.push({
            lat: step.start_location.lat,
            lng: step.start_location.lng
          })
        }
        if (step.end_location) {
          steps.push({
            lat: step.end_location.lat,
            lng: step.end_location.lng
          })
        }
      })

      return NextResponse.json({
        success: true,
        distance: {
          text: leg.distance.text,
          value: leg.distance.value // メートル
        },
        duration: {
          text: leg.duration.text,
          value: leg.duration.value // 秒
        },
        polyline: polyline, // ポリラインエンコード文字列
        steps: steps, // 座標配列
        start_location: {
          lat: leg.start_location.lat,
          lng: leg.start_location.lng
        },
        end_location: {
          lat: leg.end_location.lat,
          lng: leg.end_location.lng
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error_message || `ルート取得エラー: ${data.status}`,
        status: data.status
      })
    }
  } catch (error: any) {
    console.error('Directions API Error:', error)
    return NextResponse.json(
      { error: 'ルート取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
