import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { place_id } = await request.json()
    
    if (!place_id) {
      return NextResponse.json(
        { error: 'place_idが必要です' },
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

    // Google Places API Place Details を使用して写真を取得
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=photos&key=${key}`

    const response = await fetch(url, { cache: 'no-store' })
    const data = await response.json()

    if (data.status === 'OK' && data.result?.photos && data.result.photos.length > 0) {
      // 最大5枚の写真URLを生成（各写真にmaxwidthパラメータを付与）
      const photoUrls = data.result.photos
        .slice(0, 5)
        .map((photo: any) => {
          const photoReference = photo.photo_reference
          const maxWidth = 800 // 適切なサイズで取得
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${key}`
        })

      return NextResponse.json({
        success: true,
        photoUrls: photoUrls
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '写真が見つかりませんでした',
        photoUrls: []
      })
    }
  } catch (error: any) {
    console.error('Photos API Error:', error)
    return NextResponse.json(
      { error: '写真取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
