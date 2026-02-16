import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static';


const ODPT_API_BASE = 'https://api.odpt.org/api/v4'

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
        console.error('ODPT Station API Error:', response.status, errorText)
        return NextResponse.json(
          { error: `駅検索に失敗しました: ${response.status}`, stationId: null },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      if (!data || data.length === 0) {
        console.log(`駅名「${stationName}」が見つかりませんでした`)
        return NextResponse.json({ stationId: null, stations: [] })
      }

      // 複数の駅が見つかった場合、最初の駅のIDを返す
      // owl:sameAs または @id から駅IDを取得
      const stationId = data[0]['owl:sameAs'] || data[0]['@id'] || null
      
      console.log(`駅名「${stationName}」→ 駅ID: ${stationId}`)
      
      return NextResponse.json({ 
        stationId,
        stations: data.map((s: any) => ({
          id: s['owl:sameAs'] || s['@id'],
          title: s['dc:title'],
          railway: s['odpt:railway']
        }))
      })
    } catch (error: any) {
      console.error('駅検索エラー:', error)
      return NextResponse.json(
        { error: error.message || '駅検索に失敗しました', stationId: null },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('APIエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', stationId: null },
      { status: 500 }
    )
  }
}
