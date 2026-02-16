import { NextRequest, NextResponse } from 'next/server'

/**
 * 駅すぱあと API を使用した駅名検索
 * station/light エンドポイントを使用
 */

// 駅すぱあと API のベースURL
const EKISPERT_API_BASE_URL = 'https://api.ekispert.jp/v1'

/**
 * APIキーを取得（確実に読み込む）
 */
function getApiKey(): string {
  const apiKey = process.env.EKISPERT_API_KEY
  
  console.log('🔑 [駅名検索API] EKISPERT_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : '未設定')
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ EKISPERT_API_KEY が設定されていません')
    throw new Error('EKISPERT_API_KEY が設定されていません')
  }
  
  return apiKey.trim()
}

/**
 * GET リクエストハンドラ
 * 駅名のサジェストを返す
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  console.log('')
  console.log('========================================')
  console.log('🔍 駅名検索API (駅すぱあと)')
  console.log('========================================')
  
  // APIキーの確認
  try {
    const apiKey = getApiKey()
    console.log('✅ APIキー読み込み成功')
  } catch (error: any) {
    console.error('❌ APIキー読み込み失敗:', error.message)
    return NextResponse.json({
      stations: [],
      error: 'API_KEY_MISSING',
      message: 'APIキーが設定されていません。.env.local に EKISPERT_API_KEY を設定してください。',
    }, { status: 500 })
  }
  
  // クエリから name を受け取る
  const name = searchParams.get('name') || ''
  
  console.log('📍 検索文字列:', name)
  
  // バリデーション
  if (!name || name.trim().length < 1) {
    return NextResponse.json({
      stations: [],
      error: 'INVALID_PARAMS',
      message: '検索文字列を指定してください',
    }, { status: 400 })
  }
  
  try {
    // 駅すぱあと API の station/light エンドポイントを使用
    const params = new URLSearchParams({
      key: getApiKey(),
      name: name.trim(),
    })
    
    const url = `${EKISPERT_API_BASE_URL}/json/station/light?${params.toString()}`
    
    console.log('🔍 [駅すぱあと API] 駅名検索URL:', url.replace(getApiKey(), 'KEY_HIDDEN'))
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [駅すぱあと API] 駅名検索エラー:')
      console.error('   ステータス:', response.status, response.statusText)
      console.error('   エラー内容:', errorText)
      throw new Error(`駅すぱあと API エラー: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('✅ [駅すぱあと API] レスポンス取得成功')
    
    // デバッグ: レスポンス構造を確認
    if (data.ResultSet) {
      console.log('📦 ResultSet 構造確認:')
      console.dir(data.ResultSet, { depth: 3 })
    }
    
    // ResultSet.Point から駅情報を抽出
    const stations: Array<{ name: string; code: string }> = []
    
    if (data.ResultSet && data.ResultSet.Point) {
      const points = Array.isArray(data.ResultSet.Point) ? data.ResultSet.Point : [data.ResultSet.Point]
      
      points.forEach((point: any, index: number) => {
        if (point.Station) {
          const station = point.Station
          const stationName = station.Name || station.name || station.nameKanji || ''
          
          // 駅コードの取得（複数の可能性があるプロパティを確認）
          const stationCode = station.code || station.Code || station.code || station.stationCode || ''
          
          if (stationName) {
            stations.push({
              name: stationName,
              code: stationCode || '', // 駅コードがない場合も空文字で返す
            })
            console.log(`   [${index + 1}] 駅名: ${stationName}, コード: ${stationCode || '(なし)'}`)
          }
        }
      })
    }
    
    console.log(`📊 検索結果: ${stations.length}件`)
    
    return NextResponse.json({
      stations,
      message: '検索が完了しました',
    })
    
  } catch (error: any) {
    console.error('❌ 駅名検索エラー:', error)
    
    return NextResponse.json({
      stations: [],
      error: 'SEARCH_ERROR',
      message: `駅名検索に失敗しました: ${error.message || '不明なエラー'}`,
    }, { status: 500 })
  }
}
