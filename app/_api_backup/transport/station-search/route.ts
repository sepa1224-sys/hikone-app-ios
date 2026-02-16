import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static';


const ODPT_API_BASE = 'https://api.odpt.jp/api/v4'

// フォールバックトークン
const FALLBACK_TOKEN = '6i7bm9sauna68506eqc3s0qv13uhnn70yx6qrqvn8aznjnqzydv365fa0smcc5fy'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stationName = searchParams.get('stationName')

    if (!stationName) {
      return NextResponse.json(
        { error: '駅名が必要です' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_ODPT_ACCESS_TOKEN || process.env.ODPT_ACCESS_TOKEN || FALLBACK_TOKEN

    try {
      // odpt:Station APIで駅名から検索
      const response = await fetch(
        `${ODPT_API_BASE}/odpt:Station?dc:title=${encodeURIComponent(stationName)}&acl:consumerKey=${apiKey}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ODPT Station Search Error:', response.status, errorText)
        return NextResponse.json({ stations: [] })
      }

      const data = await response.json()
      
      if (!data || data.length === 0) {
        return NextResponse.json({ stations: [] })
      }

      // 駅情報を整形して返す
      const stations = data.map((station: any) => ({
        id: station['@id'] || station['owl:sameAs'],
        title: station['dc:title'] || stationName,
        railway: station['odpt:railway']?.replace(/^.*:/, '') || '不明',
        stationCode: station['odpt:stationCode'] || null
      }))

      return NextResponse.json({ stations })
    } catch (error: any) {
      console.error('駅検索エラー:', error)
      return NextResponse.json({ stations: [] })
    }
  } catch (error: any) {
    console.error('APIエラー:', error)
    return NextResponse.json({ stations: [] })
  }
}
