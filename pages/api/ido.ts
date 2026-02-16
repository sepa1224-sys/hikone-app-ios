import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET メソッドのみ対応
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { startLat, startLon, goalLat, goalLon, start_time } = req.query

  // パラメータ検証
  if (!startLat || !startLon || !goalLat || !goalLon) {
    return res.status(400).json({ error: 'パラメータが不足しています。startLat, startLon, goalLat, goalLon が必要です。' })
  }

  // RAPIDAPI_KEY のチェック
  if (!process.env.RAPIDAPI_KEY) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY が設定されていません。' })
  }

  try {
    // RapidAPI URL 構築
    const startTime = (start_time as string) || new Date().toISOString().split('.')[0]
    const url = `https://navitime-route-totalnavi.p.rapidapi.com/route_transit?start=${startLat},${startLon}&goal=${goalLat},${goalLon}&datum=wgs84&term=1440&limit=5&start_time=${encodeURIComponent(startTime)}&coord_unit=degree`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
        'X-RapidAPI-Host': 'navitime-route-totalnavi.p.rapidapi.com',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()

    // 最大3件に絞る
    const routes = (data.items || []).slice(0, 3).map((item: any) => ({
      departure_time: item.summary?.start_time || item.departure_time || '',
      route_info: item.summary || item.route_summary || item, // route_summary などの場所に経路情報が入っている場合
    }))

    res.status(200).json({ routes })
  } catch (err: any) {
    console.error('[API] 経路検索エラー:', err)
    res.status(500).json({ error: '経路検索に失敗しました' })
  }
}
