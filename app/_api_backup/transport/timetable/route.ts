import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static';


// ステップ1: ベースURLの完全固定（末尾スラッシュなし）
const ODPT_API_BASE = 'https://api.odpt.jp/api/v4'

// ステップ4: フォールバック（一時的にハードコード）
const FALLBACK_TOKEN = '6i7bm9sauna68506eqc3s0qv13uhnn70yx6qrqvn8aznjnqzydv365fa0smcc5fy'

// 駅IDから駅名の逆引きマッピング（フォールバック検索用）
// 注意: 駅IDは路線ごとに異なるため、正しいIDを使用（Tokaido=東海道線）
const STATION_ID_TO_NAME: Record<string, string> = {
  'odpt.Station:JR-West.Tokaido.Hikone': '彦根',
  'odpt.Station:JR-West.Tokaido.MinamiHikone': '南彦根',
  'odpt.Station:JR-West.Tokaido.Kawase': '河瀬',
  'odpt.Station:JR-West.Tokaido.Inae': '稲枝',
  'odpt.Station:JR-West.Tokaido.Maibara': '米原',
  'odpt.Station:JR-West.Tokaido.Nagahama': '長浜',
  'odpt.Station:JR-West.Tokaido.Kusatsu': '草津',
  'odpt.Station:JR-West.Tokaido.Kyoto': '京都',
  'odpt.Station:JR-West.Tokaido.Osaka': '大阪'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json(
        { error: '駅IDが必要です' },
        { status: 400 }
      )
    }

    // ステップ1, 3: サーバー側で環境変数を読み込む（NEXT_PUBLIC_プレフィックスなしでもOK）
    const apiKey = process.env.NEXT_PUBLIC_ODPT_ACCESS_TOKEN || process.env.ODPT_ACCESS_TOKEN || FALLBACK_TOKEN

    // ステップ2: デバッグ用ログ
    console.log("Token check:", !!apiKey)
    console.log("Token length:", apiKey ? apiKey.length : 0)
    console.log("Token first 10 chars:", apiKey ? apiKey.substring(0, 10) + "..." : "N/A")

    try {
      // カレンダータイプを判定（プログラム側で使用）
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=日, 1=月, ..., 6=土

      // 駅IDから駅名を逆引き（マッピングから取得）
      const stationName = STATION_ID_TO_NAME[stationId] || '彦根'

      // ステップ1: 日本語名称検索に全振り - dc:title で直接日本語を渡す
      const apiUrl = `${ODPT_API_BASE}/odpt:StationTimetable?dc:title=${encodeURIComponent(stationName)}&acl:consumerKey=${apiKey}`
      
      // デバッグ: 実際にリクエストを送ったURLを出力
      console.log('========================================')
      console.log('ODPT API Request URL (Flexible Search - dc:title):')
      console.log(apiUrl.replace(apiKey, 'TOKEN_HIDDEN'))
      console.log(`Station ID: ${stationId}`)
      console.log(`Station Name: ${stationName}`)
      console.log(`Day of week: ${dayOfWeek} (0=日, 6=土)`)
      console.log('========================================')

      // ステップ2: fetchオプションの追加（タイムアウト対策）
      let response
      let rawData: any[] = []
      let data: any[] = []
      
      try {
        response = await fetch(apiUrl, {
          cache: 'no-store', // 常に最新を取得
          headers: {
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('ODPT API Error (Flexible Search):', response.status, errorText)
          console.error('Request URL:', apiUrl.replace(apiKey, 'TOKEN_HIDDEN'))
        } else {
          rawData = await response.json() || []
          
          // ステップ4: 生データのログ出力（全データを出力）
          console.log('========================================')
          console.log('Raw API Response:')
          console.log('Raw Data:', JSON.stringify(rawData, null, 2))
          console.log(`Total items: ${rawData.length}`)
          if (rawData.length > 0) {
            console.log('First item keys:', Object.keys(rawData[0]))
            console.log('First item full:', JSON.stringify(rawData[0], null, 2))
          }
          console.log('========================================')

          // ステップ2: 取得後のフィルタリング - odpt:operator が JR-West または OhmiRailway であるものを抽出
          if (rawData && rawData.length > 0) {
            data = rawData.filter((item: any) => {
              const operator = item['odpt:operator'] || ''
              const operatorStr = String(operator)
              return operatorStr.includes('JR-West') || 
                     operatorStr.includes('odpt.Operator:JR-West') ||
                     operatorStr.includes('OhmiRailway') ||
                     operatorStr.includes('odpt.Operator:OhmiRailway')
            })
            
            console.log(`Filtered by odpt:operator (JR-West or OhmiRailway): ${data.length} items (from ${rawData.length} total)`)
          }
        }
      } catch (fetchError: any) {
        console.error('Fetch Error (Flexible Search):', fetchError)
        console.error('Fetch Error Details:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack,
          cause: fetchError.cause
        })
        // fetch failedエラーの場合は次のフォールバック処理へ
        data = []
      }

      // フォールバック: もしデータが見つからない場合は、odpt:operator をURLパラメータに追加して再検索
      if (!data || data.length === 0) {
        console.log('Flexible search failed, trying with odpt:operator parameter...')
        
        const fallbackUrl = `${ODPT_API_BASE}/odpt:StationTimetable?dc:title=${encodeURIComponent(stationName)}&odpt:operator=odpt.Operator:JR-West&acl:consumerKey=${apiKey}`
        
        console.log('========================================')
        console.log('ODPT API Request URL (Fallback with odpt:operator):')
        console.log(fallbackUrl.replace(apiKey, 'TOKEN_HIDDEN'))
        console.log('========================================')

        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            cache: 'no-store',
            headers: {
              'Accept': 'application/json'
            }
          })
          
          if (fallbackResponse.ok) {
            const fallbackRawData = await fallbackResponse.json()
            
            // 生データをログ出力
            console.log(`Fallback raw data: ${fallbackRawData.length} items`)
            if (fallbackRawData.length > 0) {
              console.log('Fallback first item keys:', Object.keys(fallbackRawData[0]))
            }
            
            data = fallbackRawData || []
            console.log(`Fallback search succeeded! Found ${data.length} timetables`)
          }
        } catch (fallbackError: any) {
          console.error('Fetch Error (Fallback):', fallbackError)
        }
      }

      // ステップ4: 万が一のための全データ表示
      if (!data || data.length === 0) {
        console.log('========================================')
        console.log('No data found after filtering. Outputting ALL raw data:')
        console.log('Raw Data:', JSON.stringify(rawData, null, 2))
        console.log('========================================')
        
        return NextResponse.json({ 
          timetables: [],
          debugInfo: {
            searchedStationId: stationId,
            searchedStationName: stationName,
            message: 'データが見つかりませんでした',
            rawDataCount: rawData.length,
            rawData: rawData
          }
        })
      }

      // 時刻表データを解析して、現在時刻以降の直近3本を取得
      const timetable = data[0]
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      // ステップ4: 生データのログ出力（取得したデータの構造を確認）
      console.log('========================================')
      console.log('Parsing Timetable Data:')
      console.log('Timetable object keys:', Object.keys(timetable))
      console.log(`odpt:weekdays exists: ${!!timetable['odpt:weekdays']}`)
      console.log(`odpt:saturdays exists: ${!!timetable['odpt:saturdays']}`)
      console.log(`odpt:holidays exists: ${!!timetable['odpt:holidays']}`)
      if (timetable['odpt:weekdays']) {
        console.log(`odpt:weekdays length: ${timetable['odpt:weekdays'].length}`)
        if (timetable['odpt:weekdays'].length > 0) {
          console.log('odpt:weekdays[0] sample:', JSON.stringify(timetable['odpt:weekdays'][0]).substring(0, 200))
        }
      }
      if (timetable['odpt:saturdays']) {
        console.log(`odpt:saturdays length: ${timetable['odpt:saturdays'].length}`)
        if (timetable['odpt:saturdays'].length > 0) {
          console.log('odpt:saturdays[0] sample:', JSON.stringify(timetable['odpt:saturdays'][0]).substring(0, 200))
        }
      }
      if (timetable['odpt:holidays']) {
        console.log(`odpt:holidays length: ${timetable['odpt:holidays'].length}`)
        if (timetable['odpt:holidays'].length > 0) {
          console.log('odpt:holidays[0] sample:', JSON.stringify(timetable['odpt:holidays'][0]).substring(0, 200))
        }
      }
      console.log('========================================')

      const entries: any[] = []
      
      // ステップ3: 曜日のハードコードテスト（土休日ダイヤを強制取得）
      // odpt:weekdays, odpt:saturdays, odpt:holidays から時刻表を取得
      const weekdayTimetable = timetable['odpt:weekdays'] || []
      const saturdayTimetable = timetable['odpt:saturdays'] || []
      const holidayTimetable = timetable['odpt:holidays'] || []
      
      // ステップ3: ハードコードテスト - 土休日ダイヤを強制的に取得
      const isWeekend = true // 一時的に固定
      
      let targetTimetable: any[] = []
      
      console.log('========================================')
      console.log('Calendar Debug Info (Hardcoded Weekend Test):')
      console.log(`isWeekend (hardcoded): ${isWeekend}`)
      console.log(`Day of week (actual): ${dayOfWeek} (0=日, 1=月, ..., 6=土)`)
      console.log(`Weekday timetable entries: ${weekdayTimetable.length}`)
      console.log(`Saturday timetable entries: ${saturdayTimetable.length}`)
      console.log(`Holiday timetable entries: ${holidayTimetable.length}`)
      
      // 土休日ダイヤを強制取得
      if (isWeekend) {
        console.log('Forcing weekend/holiday timetable (hardcoded)')
        if (saturdayTimetable.length > 0) {
          targetTimetable = saturdayTimetable
          console.log('Using odpt:saturdays timetable')
        } else if (holidayTimetable.length > 0) {
          targetTimetable = holidayTimetable
          console.log('Using odpt:holidays timetable')
        } else {
          targetTimetable = weekdayTimetable
          console.log('Fallback to odpt:weekdays timetable')
        }
      } else {
        // 平日（通常は使用しないが、念のため）
        targetTimetable = weekdayTimetable
        console.log(`Using odpt:weekdays timetable`)
      }
      
      console.log(`Selected timetable entries: ${targetTimetable.length}`)
      console.log('========================================')

      for (const timeEntry of targetTimetable) {
        if (entries.length >= 3) break

        const timeStr = timeEntry['odpt:departureTime'] || timeEntry['odpt:arrivalTime']
        if (!timeStr) continue

        const [hours, minutes] = timeStr.split(':').map(Number)
        const entryMinutes = hours * 60 + minutes

        // 現在時刻以降の時刻のみ
        if (entryMinutes >= currentMinutes) {
          entries.push({
            departureTime: timeStr,
            destination: timeEntry['odpt:destinationStation']?.[0]?.replace(/^.*:/, '') || '不明',
            trainType: timeEntry['odpt:trainType'] || '普通',
            lineName: timetable['odpt:railway']?.replace(/^.*:/, '') || '不明'
          })
        }
      }

      return NextResponse.json({ timetables: entries.slice(0, 3) })
    } catch (error: any) {
      // ステップ3: エラーハンドリングの強化
      console.error('========================================')
      console.error('時刻表取得エラー (詳細):')
      console.error('Error Message:', error.message)
      console.error('Error Name:', error.name)
      console.error('Error Stack:', error.stack)
      if (error.cause) {
        console.error('Error Cause:', error.cause)
      }
      console.error('========================================')
      
      return NextResponse.json(
        { 
          error: '通信に失敗したニャ...', 
          details: String(error),
          message: error.message || '時刻表取得に失敗しました'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    // ステップ3: エラーハンドリングの強化
    console.error('========================================')
    console.error('APIエラー (詳細):')
    console.error('Error Message:', error.message)
    console.error('Error Name:', error.name)
    console.error('Error Stack:', error.stack)
    if (error.cause) {
      console.error('Error Cause:', error.cause)
    }
    console.error('========================================')
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: String(error),
        message: error.message || 'サーバーエラーが発生しました'
      },
      { status: 500 }
    )
  }
}
